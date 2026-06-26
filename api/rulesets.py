"""
api/rulesets.py — управление наборами правил
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from db.database import get_db
from db.models import User, UserRole, Ruleset, GroupMembership
from api.auth import get_current_user_optional, get_current_user, require_admin, require_superadmin

router = APIRouter(prefix="/rulesets", tags=["rulesets"])


# ── Схемы ─────────────────────────────────────────────────────────────────────

class RulesetOut(BaseModel):
    id:          int
    name:        str
    description: Optional[str]
    is_public:   bool
    is_active:   bool
    owner_name:  Optional[str]
    created_at:  datetime

    class Config:
        from_attributes = True


class RulesetDetail(RulesetOut):
    config_json: str


class RulesetCreate(BaseModel):
    name:        str
    description: Optional[str] = None
    is_public:   bool = False
    config_json: str


class RulesetUpdate(BaseModel):
    name:        Optional[str] = None
    description: Optional[str] = None
    config_json: Optional[str] = None
    is_active:   Optional[bool] = None


def _ruleset_out(r: Ruleset) -> dict:
    return {
        "id":          r.id,
        "name":        r.name,
        "description": r.description,
        "is_public":   r.is_public,
        "is_active":   r.is_active,
        "owner_name":  r.owner.full_name or r.owner.email if r.owner else None,
        "created_at":  r.created_at,
    }


def _get_accessible_rulesets(user: Optional[User], db: Session) -> list[Ruleset]:
    """Возвращает наборы доступные текущему пользователю/гостю."""
    public = db.query(Ruleset).filter(
        Ruleset.is_public == True, Ruleset.is_active == True
    ).all()

    if not user:
        return public

    # Для авторизованного — добавляем приватные из его групп
    admin_ids = [m.admin_id for m in
                 db.query(GroupMembership).filter(GroupMembership.user_id == user.id).all()]

    private = []
    if admin_ids:
        private = db.query(Ruleset).filter(
            Ruleset.is_public == False,
            Ruleset.is_active == True,
            Ruleset.owner_id.in_(admin_ids),
        ).all()

    # Если пользователь сам админ — добавляем его собственные наборы
    if user.role in (UserRole.admin, UserRole.superadmin):
        own = db.query(Ruleset).filter(
            Ruleset.owner_id == user.id,
            Ruleset.is_active == True,
        ).all()
        private += [r for r in own if r not in private]

    seen = {r.id for r in public}
    result = list(public)
    for r in private:
        if r.id not in seen:
            result.append(r)
            seen.add(r.id)
    return result


# ── Публичные эндпоинты ───────────────────────────────────────────────────────

@router.get("", response_model=list[RulesetOut])
def list_rulesets(
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Список наборов доступных текущему пользователю (или гостю)."""
    return [_ruleset_out(r) for r in _get_accessible_rulesets(user, db)]


@router.get("/{ruleset_id}", response_model=RulesetDetail)
def get_ruleset(
    ruleset_id: int,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    accessible_ids = {r.id for r in _get_accessible_rulesets(user, db)}
    if ruleset_id not in accessible_ids:
        raise HTTPException(status_code=404, detail="Набор правил не найден")
    r = db.query(Ruleset).filter(Ruleset.id == ruleset_id).first()
    return {**_ruleset_out(r), "config_json": r.config_json}


# ── Эндпоинты администратора ─────────────────────────────────────────────────

@router.get("/admin/my", response_model=list[RulesetOut])
def my_rulesets(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Наборы текущего администратора."""
    rulesets = db.query(Ruleset).filter(Ruleset.owner_id == user.id).all()
    return [_ruleset_out(r) for r in rulesets]


@router.post("/admin/my", response_model=RulesetOut, status_code=201)
def create_ruleset(
    data: RulesetCreate,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Валидируем JSON
    try:
        json.loads(data.config_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Некорректный JSON в config_json")

    is_public = data.is_public if user.role == UserRole.superadmin else False

    r = Ruleset(
        name=data.name,
        description=data.description,
        is_public=is_public,
        config_json=data.config_json,
        owner_id=user.id,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _ruleset_out(r)


@router.put("/admin/my/{ruleset_id}", response_model=RulesetOut)
def update_ruleset(
    ruleset_id: int,
    data: RulesetUpdate,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    r = db.query(Ruleset).filter(
        Ruleset.id == ruleset_id, Ruleset.owner_id == user.id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Набор не найден или нет прав")

    if data.name is not None:        r.name = data.name
    if data.description is not None: r.description = data.description
    if data.is_active is not None:   r.is_active = data.is_active
    if data.config_json is not None:
        try:
            json.loads(data.config_json)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Некорректный JSON")
        r.config_json = data.config_json

    db.commit()
    db.refresh(r)
    return _ruleset_out(r)


@router.delete("/admin/my/{ruleset_id}", status_code=204)
def delete_ruleset(
    ruleset_id: int,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    r = db.query(Ruleset).filter(
        Ruleset.id == ruleset_id, Ruleset.owner_id == user.id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Набор не найден или нет прав")
    db.delete(r)
    db.commit()
