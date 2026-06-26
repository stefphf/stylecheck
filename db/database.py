"""db/database.py — подключение к БД и сидирование"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base, User, UserRole, Ruleset
import os, json
from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./checker.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    _seed_superadmin()
    _seed_public_rulesets()

def _seed_superadmin():
    email    = os.getenv("SUPERADMIN_EMAIL", "superadmin@example.com")
    password = os.getenv("SUPERADMIN_PASSWORD", "superadmin123")
    db = SessionLocal()
    try:
        from api.auth import hash_password, verify_password
        sa = db.query(User).filter(User.role == UserRole.superadmin).first()

        if sa is None:
            # Создаём нового суперадмина
            db.add(User(email=email, password=hash_password(password),
                        full_name="Суперадминистратор", role=UserRole.superadmin))
            db.commit()
            print(f"✅ Суперадмин создан: {email}")
        elif sa.email != email or not verify_password(password, sa.password):
            # Обновляем email и пароль если они не совпадают с env
            sa.email = email
            sa.password = hash_password(password)
            db.commit()
            print(f"✅ Суперадмин обновлён: {email}")
        else:
            print(f"✅ Суперадмин: {sa.email}")
    finally:
        db.close()

def _seed_public_rulesets():
    db = SessionLocal()
    try:
        if db.query(Ruleset).filter(Ruleset.is_public == True).count() > 0:
            return
        sa = db.query(User).filter(User.role == UserRole.superadmin).first()
        if not sa:
            return
        cfg_path = Path(__file__).parent.parent / "style_checker" / "config" / "vkr_itmo.json"
        if not cfg_path.exists():
            return
        with open(cfg_path, encoding="utf-8") as f:
            cfg = json.load(f)

        ruleset = Ruleset(
            name="ВКР — требования ИТМО",
            description=(
                "Проверка выпускных квалификационных работ по требованиям ИТМО: "
                "структура документа, терминология, оформление текста и параметры страницы "
                "(поля, шрифт Times New Roman 14 пт, интервал 1.5, отступ 1.25 см)."
            ),
            is_public=True,
            owner_id=sa.id,
            config_json=json.dumps(cfg, ensure_ascii=False),
        )
        db.add(ruleset)
        db.commit()
        print("✅ Публичный набор создан: ВКР — требования ИТМО")
    finally:
        db.close()
