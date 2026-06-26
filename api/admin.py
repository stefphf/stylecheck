"""
api/admin.py — панели администратора и суперадминистратора
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from db.database import get_db
from db.models import User, UserRole, GroupMembership, Ruleset, Report, Document, AuditLog
from api.auth import (require_admin, require_superadmin,
                       get_current_user, hash_password)

router = APIRouter(tags=["admin"])


# ── Схемы ─────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id:         int
    email:      str
    full_name:  Optional[str]
    role:       str
    is_active:  bool
    created_at: datetime

    class Config:
        from_attributes = True


class CreateAdminRequest(BaseModel):
    email:     str
    password:  str
    full_name: Optional[str] = None


class BlockAdminRequest(BaseModel):
    is_active: bool


class ReportSummary(BaseModel):
    id:           int
    filename:     str
    user_email:   str
    ruleset_name: Optional[str]
    checked_at:   datetime
    passed:       bool
    total_errors: int
    total_warnings: int


class StatsOut(BaseModel):
    total_users:     int
    total_admins:    int
    total_rulesets:  int
    total_reports:   int
    reports_passed:  int
    reports_failed:  int


# ── Администратор: управление группой ─────────────────────────────────────────

@router.get("/admin/group", response_model=list[UserOut])
def get_group(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Список пользователей группы текущего администратора."""
    memberships = db.query(GroupMembership).filter(
        GroupMembership.admin_id == user.id
    ).all()
    return [m.user for m in memberships]


@router.post("/admin/group", response_model=UserOut, status_code=201)
def add_to_group(
    email: str,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Добавить пользователя в группу по email."""
    target = db.query(User).filter(User.email == email).first()
    if not target:
        raise HTTPException(status_code=404, detail=f"Пользователь {email} не найден")
    if target.id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя добавить себя")
    if target.role != UserRole.user:
        raise HTTPException(status_code=400, detail="Можно добавлять только пользователей")

    exists = db.query(GroupMembership).filter(
        GroupMembership.admin_id == user.id,
        GroupMembership.user_id == target.id,
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Пользователь уже в группе")

    db.add(GroupMembership(admin_id=user.id, user_id=target.id))
    db.add(AuditLog(user_id=user.id, action="add_to_group", details=email))
    db.commit()
    return target


@router.delete("/admin/group/{user_id}", status_code=204)
def remove_from_group(
    user_id: int,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Удалить пользователя из группы."""
    m = db.query(GroupMembership).filter(
        GroupMembership.admin_id == user.id,
        GroupMembership.user_id == user_id,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Пользователь не в группе")
    db.delete(m)
    db.add(AuditLog(user_id=user.id, action="remove_from_group",
                    details=str(user_id)))
    db.commit()


@router.get("/admin/group/history", response_model=list[ReportSummary])
def group_history(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """История проверок пользователей группы."""
    member_ids = [m.user_id for m in
                  db.query(GroupMembership).filter(GroupMembership.admin_id == user.id).all()]
    if not member_ids:
        return []

    rows = (
        db.query(Report, Document, User)
        .join(Document, Report.document_id == Document.id)
        .join(User, Document.user_id == User.id)
        .filter(Document.user_id.in_(member_ids))
        .order_by(Report.checked_at.desc())
        .limit(100)
        .all()
    )
    return [
        ReportSummary(
            id=r.id,
            filename=d.filename,
            user_email=u.email,
            ruleset_name=r.ruleset_name,
            checked_at=r.checked_at,
            passed=r.passed,
            total_errors=r.total_errors,
            total_warnings=r.total_warnings,
        )
        for r, d, u in rows
    ]


@router.get("/admin/audit", response_model=list[dict])
def admin_audit(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Журнал действий пользователей группы."""
    member_ids = [m.user_id for m in
                  db.query(GroupMembership).filter(GroupMembership.admin_id == user.id).all()]
    logs = (
        db.query(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
        .filter(AuditLog.user_id.in_(member_ids))
        .order_by(AuditLog.created_at.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id":         l.id,
            "user_email": u.email if u else "—",
            "action":     l.action,
            "details":    l.details,
            "created_at": l.created_at.isoformat(),
        }
        for l, u in logs
    ]


# ── Суперадминистратор ────────────────────────────────────────────────────────

@router.post("/superadmin/admins", response_model=UserOut, status_code=201)
def create_admin(
    data: CreateAdminRequest,
    current: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Создать администратора."""
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    admin = User(
        email=data.email,
        password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.admin,
        created_by=current.id,
    )
    db.add(admin)
    db.add(AuditLog(user_id=current.id, action="create_admin", details=data.email))
    db.commit()
    db.refresh(admin)
    return admin


@router.get("/superadmin/admins", response_model=list[UserOut])
def list_admins(current: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == UserRole.admin).all()


@router.patch("/superadmin/admins/{admin_id}/block", response_model=UserOut)
def block_admin(
    admin_id: int,
    data: BlockAdminRequest,
    current: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Заблокировать или разблокировать администратора."""
    admin = db.query(User).filter(
        User.id == admin_id, User.role == UserRole.admin
    ).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Администратор не найден")
    if admin.id == current.id:
        raise HTTPException(status_code=400, detail="Нельзя заблокировать себя")

    admin.is_active = data.is_active
    action = "unblock_admin" if data.is_active else "block_admin"
    db.add(AuditLog(user_id=current.id, action=action, details=admin.email))
    db.commit()
    db.refresh(admin)
    return admin


@router.get("/superadmin/users", response_model=list[UserOut])
def list_users(current: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == UserRole.user).all()


@router.get("/superadmin/stats", response_model=StatsOut)
def stats(current: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    total_reports  = db.query(Report).count()
    reports_passed = db.query(Report).filter(Report.passed == True).count()
    return StatsOut(
        total_users=db.query(User).filter(User.role == UserRole.user).count(),
        total_admins=db.query(User).filter(User.role == UserRole.admin).count(),
        total_rulesets=db.query(Ruleset).count(),
        total_reports=total_reports,
        reports_passed=reports_passed,
        reports_failed=total_reports - reports_passed,
    )


@router.get("/superadmin/audit", response_model=list[dict])
def superadmin_audit(current: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    logs = (
        db.query(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(AuditLog.created_at.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id":         l.id,
            "user_email": u.email if u else "—",
            "role":       u.role.value if u else "—",
            "action":     l.action,
            "details":    l.details,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat(),
        }
        for l, u in logs
    ]
