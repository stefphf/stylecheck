"""
db/models.py — модели базы данных
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    DateTime, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class UserRole(str, enum.Enum):
    user       = "user"
    admin      = "admin"
    superadmin = "superadmin"


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String(255), unique=True, nullable=False, index=True)
    password   = Column(String(255), nullable=False)
    full_name  = Column(String(255), nullable=True)
    role       = Column(SAEnum(UserRole), default=UserRole.user, nullable=False)
    is_active  = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    documents         = relationship("Document", back_populates="owner")
    audit_logs        = relationship("AuditLog", back_populates="user")
    owned_rulesets    = relationship("Ruleset", back_populates="owner")
    group_memberships = relationship("GroupMembership",
                                     foreign_keys="GroupMembership.user_id",
                                     back_populates="user")
    managed_members   = relationship("GroupMembership",
                                     foreign_keys="GroupMembership.admin_id",
                                     back_populates="admin")


class Ruleset(Base):
    """Набор правил — цифровое представление руководства по стилю."""
    __tablename__ = "rulesets"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_public   = Column(Boolean, default=False, nullable=False)
    config_json = Column(Text, nullable=False)   # JSON с правилами
    owner_id    = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner   = relationship("User", back_populates="owned_rulesets")
    reports = relationship("Report", back_populates="ruleset")


class GroupMembership(Base):
    """Пользователь в группе администратора."""
    __tablename__ = "group_memberships"

    id       = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)

    admin = relationship("User", foreign_keys=[admin_id], back_populates="managed_members")
    user  = relationship("User", foreign_keys=[user_id], back_populates="group_memberships")


class Document(Base):
    __tablename__ = "documents"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename    = Column(String(255), nullable=False)
    file_size   = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    owner   = relationship("User", back_populates="documents")
    reports = relationship("Report", back_populates="document")


class Report(Base):
    __tablename__ = "reports"

    id             = Column(Integer, primary_key=True, index=True)
    document_id    = Column(Integer, ForeignKey("documents.id"), nullable=True)
    ruleset_id     = Column(Integer, ForeignKey("rulesets.id"), nullable=True)
    ruleset_name   = Column(String(255), nullable=True)   # snapshot названия
    checked_at     = Column(DateTime, default=datetime.utcnow)
    passed         = Column(Boolean, default=False)
    total_errors   = Column(Integer, default=0)
    total_warnings = Column(Integer, default=0)
    result_json    = Column(Text, nullable=False)
    share_token    = Column(String(64), unique=True, nullable=True, index=True)

    document   = relationship("Document", back_populates="reports")
    ruleset    = relationship("Ruleset", back_populates="reports")
    violations = relationship("ReportViolation", back_populates="report")


class ReportViolation(Base):
    __tablename__ = "report_violations"

    id         = Column(Integer, primary_key=True, index=True)
    report_id  = Column(Integer, ForeignKey("reports.id"), nullable=False)
    rule_id    = Column(String(100), nullable=False)
    category   = Column(String(50), nullable=False)
    severity   = Column(String(20), nullable=False)
    message    = Column(Text, nullable=False)
    location   = Column(String(255), nullable=True)
    suggestion = Column(Text, nullable=True)

    report = relationship("Report", back_populates="violations")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=True)
    action     = Column(String(100), nullable=False)
    details    = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")
