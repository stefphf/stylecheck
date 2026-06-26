"""
app.py — StyleCheck API сервер

Запуск:
    python app.py

Переменные окружения:
    SUPERADMIN_EMAIL     — email суперадмина (по умолчанию: superadmin@example.com)
    SUPERADMIN_PASSWORD  — пароль суперадмина (по умолчанию: superadmin123)
    SECRET_KEY           — секрет для JWT
    DATABASE_URL         — строка подключения к БД (по умолчанию: SQLite)
"""

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from db.database import init_db
from api.auth import router as auth_router
from api.rulesets import router as rulesets_router
from api.checker_api import router as checker_router
from api.admin import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("✅ База данных инициализирована")
    print("📖 API docs:    http://localhost:8000/docs")
    print("🔑 Суперадмин:  superadmin@example.com / superadmin123")
    yield


app = FastAPI(
    title="StyleCheck API",
    description="Проверка документов на соответствие руководству по стилю",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,     prefix="/api")
app.include_router(rulesets_router, prefix="/api")
app.include_router(checker_router,  prefix="/api")
app.include_router(admin_router,    prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
