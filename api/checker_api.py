"""
api/checker_api.py — загрузка документов, проверка, отчёты
"""

import json, secrets
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from db.database import get_db
from db.models import User, Document, Report, ReportViolation, Ruleset
from api.auth import get_current_user, get_current_user_optional
from api.rulesets import _get_accessible_rulesets
from style_checker import CheckEngine, load_config_from_dict

router = APIRouter(prefix="/check", tags=["checker"])
MAX_FILE_SIZE = 10 * 1024 * 1024


# ── Схемы ─────────────────────────────────────────────────────────────────────

class ViolationOut(BaseModel):
    rule_id:      str
    category:     str
    severity:     str
    message:      str
    location:     Optional[str]
    page_number:  Optional[int]
    para_on_page: Optional[int]
    suggestion:   Optional[str]
    context:      Optional[str]
    global_index: Optional[int]
    in_table:     bool = False
    is_image:     bool = False


class ReportOut(BaseModel):
    id:             int
    filename:       str
    ruleset_name:   Optional[str]
    checked_at:     datetime
    passed:         bool
    total_errors:   int
    total_warnings: int
    page_count:     int = 1
    skip_pages:     list[int] = []
    violations:     list[ViolationOut]
    share_token:    Optional[str] = None

    class Config:
        from_attributes = True


class ReportSummary(BaseModel):
    id:             int
    filename:       str
    ruleset_name:   Optional[str]
    checked_at:     datetime
    passed:         bool
    total_errors:   int
    total_warnings: int

    class Config:
        from_attributes = True


# ── Вспомогательные функции ───────────────────────────────────────────────────

def _build_report_out(report: Report, violations_raw: list[dict],
                      page_count: int, skip_pages: list[int]) -> ReportOut:
    return ReportOut(
        id=report.id,
        filename=report.document.filename if report.document else "документ.docx",
        ruleset_name=report.ruleset_name,
        checked_at=report.checked_at,
        passed=report.passed,
        total_errors=report.total_errors,
        total_warnings=report.total_warnings,
        page_count=page_count,
        skip_pages=skip_pages,
        share_token=report.share_token,
        violations=[
            ViolationOut(
                rule_id=v.get("rule_id", ""),
                category=v.get("category", ""),
                severity=v.get("severity", ""),
                message=v.get("message", ""),
                location=v.get("location"),
                page_number=v.get("page_number"),
                para_on_page=v.get("para_on_page"),
                suggestion=v.get("suggestion"),
                context=v.get("context"),
                global_index=v.get("global_index"),
                in_table=v.get("in_table", False),
                is_image=v.get("is_image", False),
            )
            for v in violations_raw
        ],
    )


# ── Эндпоинты ─────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=ReportOut, status_code=201)
async def upload_and_check(
    file:       UploadFile = File(...),
    ruleset_id: int        = Form(...),
    skip_pages: str        = Form(""),
    user: Optional[User]   = Depends(get_current_user_optional),
    db: Session            = Depends(get_db),
):
    """Загружает DOCX и запускает проверку по выбранному набору правил."""
    if not file.filename or not file.filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Поддерживаются только файлы .docx")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой (максимум 10 МБ)")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Файл пустой")

    # Проверяем доступ к набору правил
    accessible = {r.id: r for r in _get_accessible_rulesets(user, db)}
    if ruleset_id not in accessible:
        raise HTTPException(status_code=403, detail="Набор правил недоступен")

    ruleset = accessible[ruleset_id]
    config = json.loads(ruleset.config_json)

    # Парсим страницы для пропуска
    skip_set = set()
    if skip_pages:
        for p in skip_pages.split(","):
            p = p.strip()
            if p.isdigit():
                skip_set.add(int(p))

    # Запускаем проверку
    try:
        engine = CheckEngine(config)
        report_obj = engine.run(content, filename=file.filename, skip_pages=skip_set)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Ошибка обработки документа: {e}")

    report_dict = report_obj.to_dict()

    # Сохраняем документ и отчёт только для авторизованных
    report = None
    if user:
        doc = Document(user_id=user.id, filename=file.filename, file_size=len(content))
        db.add(doc)
        db.commit()
        db.refresh(doc)

        report = Report(
            document_id=doc.id,
            ruleset_id=ruleset.id,
            ruleset_name=ruleset.name,
            passed=report_obj.passed,
            total_errors=report_obj.total_errors,
            total_warnings=report_obj.total_warnings,
            result_json=json.dumps(report_dict, ensure_ascii=False),
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        for result in report_dict.get("results", []):
            for v in result.get("violations", []):
                db.add(ReportViolation(
                    report_id=report.id,
                    rule_id=v.get("rule_id", ""),
                    category=v.get("category", ""),
                    severity=v.get("severity", ""),
                    message=v.get("message", ""),
                    location=v.get("location"),
                    suggestion=v.get("suggestion"),
                ))
        db.commit()

    # Собираем все нарушения из отчёта
    all_violations = []
    for result in report_dict.get("results", []):
        all_violations.extend(result.get("violations", []))

    # Для гостей возвращаем временный объект
    if not report:
        from db.models import Report as ReportModel, Document as DocModel
        temp_report = ReportModel(
            id=0,
            ruleset_name=ruleset.name,
            passed=report_obj.passed,
            total_errors=report_obj.total_errors,
            total_warnings=report_obj.total_warnings,
            result_json="",
            checked_at=report_obj.checked_at if hasattr(report_obj, 'checked_at') else datetime.utcnow(),
        )
        temp_doc = DocModel(filename=file.filename)
        temp_report.document = temp_doc

        return ReportOut(
            id=0,
            filename=file.filename,
            ruleset_name=ruleset.name,
            checked_at=datetime.utcnow(),
            passed=report_obj.passed,
            total_errors=report_obj.total_errors,
            total_warnings=report_obj.total_warnings,
            page_count=report_obj.page_count,
            skip_pages=list(skip_set),
            violations=[
                ViolationOut(
                    rule_id=v.get("rule_id", ""),
                    category=v.get("category", ""),
                    severity=v.get("severity", ""),
                    message=v.get("message", ""),
                    location=v.get("location"),
                    page_number=v.get("page_number"),
                    para_on_page=v.get("para_on_page"),
                    suggestion=v.get("suggestion"),
                    context=v.get("context"),
                    global_index=v.get("global_index"),
                    in_table=v.get("in_table", False),
                    is_image=v.get("is_image", False),
                )
                for v in all_violations
            ],
        )

    return _build_report_out(report, all_violations, report_obj.page_count, list(skip_set))


@router.get("/history", response_model=list[ReportSummary])
def get_history(
    db: Session = Depends(get_db),
    user: User  = Depends(get_current_user),
):
    rows = (
        db.query(Report, Document)
        .join(Document, Report.document_id == Document.id)
        .filter(Document.user_id == user.id)
        .order_by(Report.checked_at.desc())
        .limit(50)
        .all()
    )
    return [
        ReportSummary(
            id=r.id,
            filename=d.filename,
            ruleset_name=r.ruleset_name,
            checked_at=r.checked_at,
            passed=r.passed,
            total_errors=r.total_errors,
            total_warnings=r.total_warnings,
        )
        for r, d in rows
    ]


@router.get("/history/{report_id}", response_model=ReportOut)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: User  = Depends(get_current_user),
):
    row = (
        db.query(Report, Document)
        .join(Document, Report.document_id == Document.id)
        .filter(Report.id == report_id, Document.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Отчёт не найден")

    report, _ = row
    data = json.loads(report.result_json)
    all_v = []
    for result in data.get("results", []):
        all_v.extend(result.get("violations", []))

    return _build_report_out(report, all_v,
                              data.get("page_count", 1),
                              data.get("skip_pages", []))


@router.post("/history/{report_id}/share", response_model=dict)
def share_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: User  = Depends(get_current_user),
):
    """Генерирует публичную ссылку на отчёт."""
    row = (
        db.query(Report, Document)
        .join(Document, Report.document_id == Document.id)
        .filter(Report.id == report_id, Document.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Отчёт не найден")

    report, _ = row
    if not report.share_token:
        report.share_token = secrets.token_urlsafe(32)
        db.commit()

    return {"share_token": report.share_token}


@router.get("/shared/{token}", response_model=ReportOut)
def get_shared_report(token: str, db: Session = Depends(get_db)):
    """Публичный отчёт по токену — без авторизации."""
    report = db.query(Report).filter(Report.share_token == token).first()
    if not report:
        raise HTTPException(status_code=404, detail="Отчёт не найден")

    data = json.loads(report.result_json)
    all_v = []
    for result in data.get("results", []):
        all_v.extend(result.get("violations", []))

    return _build_report_out(report, all_v,
                              data.get("page_count", 1),
                              data.get("skip_pages", []))
