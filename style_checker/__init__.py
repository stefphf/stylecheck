"""
style_checker — пакет автоматической проверки документов.

Публичный API:
    from style_checker import CheckEngine, load_config

    config = load_config()                  # из config/rules.json
    engine = CheckEngine(config)
    report = engine.run("document.docx")   # или bytes/BytesIO
    report.print_summary()
    data   = report.to_dict()              # JSON-сериализация для БД / API
"""

from .core.engine import CheckEngine
from .core.config_loader import load_config, load_config_from_dict, merge_configs
from .models.report import Report, CheckResult, Violation, Severity, CheckCategory

__all__ = [
    "CheckEngine",
    "load_config",
    "load_config_from_dict",
    "merge_configs",
    "Report",
    "CheckResult",
    "Violation",
    "Severity",
    "CheckCategory",
]
