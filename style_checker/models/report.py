"""
models/report.py — структуры данных для результатов проверки.
"""

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional
import datetime
import json


class Severity(str, Enum):
    ERROR   = "error"
    WARNING = "warning"
    INFO    = "info"


class CheckCategory(str, Enum):
    STRUCTURE   = "structure"
    TERMINOLOGY = "terminology"
    FORMATTING  = "formatting"


@dataclass
class Violation:
    rule_id:      str
    category:     CheckCategory
    severity:     Severity
    message:      str
    location:     Optional[str] = None    # "Стр. N, абз. M"
    page_number:  Optional[int] = None    # Номер страницы
    para_on_page: Optional[int] = None    # Абзац на странице
    suggestion:   Optional[str] = None
    context:      Optional[str] = None    # Текст параграфа с ошибкой
    global_index: Optional[int] = None   # Глобальный порядковый номер (для сортировки)
    in_table:     bool = False
    is_image:     bool = False

    def to_dict(self) -> dict:
        return {
            "rule_id":      self.rule_id,
            "category":     self.category.value if isinstance(self.category, CheckCategory) else self.category,
            "severity":     self.severity.value if isinstance(self.severity, Severity) else self.severity,
            "message":      self.message,
            "location":     self.location,
            "page_number":  self.page_number,
            "para_on_page": self.para_on_page,
            "suggestion":   self.suggestion,
            "context":      self.context,
            "global_index": self.global_index,
            "in_table":     self.in_table,
            "is_image":     self.is_image,
        }


@dataclass
class CheckResult:
    checker_name: str
    category:     CheckCategory
    violations:   list[Violation] = field(default_factory=list)
    passed:       int = 0

    @property
    def error_count(self) -> int:
        return sum(1 for v in self.violations if v.severity == Severity.ERROR)

    @property
    def warning_count(self) -> int:
        return sum(1 for v in self.violations if v.severity == Severity.WARNING)


@dataclass
class Report:
    document_name: str
    checked_at:    str = field(default_factory=lambda: datetime.datetime.utcnow().isoformat())
    results:       list[CheckResult] = field(default_factory=list)
    page_count:    int = 1
    skip_pages:    list[int] = field(default_factory=list)

    @property
    def total_errors(self) -> int:
        return sum(r.error_count for r in self.results)

    @property
    def total_warnings(self) -> int:
        return sum(r.warning_count for r in self.results)

    @property
    def all_violations(self) -> list[Violation]:
        violations = []
        for r in self.results:
            violations.extend(r.violations)
        return violations

    @property
    def passed(self) -> bool:
        return self.total_errors == 0

    def to_dict(self) -> dict:
        return {
            "document_name": self.document_name,
            "checked_at":    self.checked_at,
            "passed":        self.passed,
            "page_count":    self.page_count,
            "skip_pages":    self.skip_pages,
            "summary": {
                "total_errors":   self.total_errors,
                "total_warnings": self.total_warnings,
            },
            "results": [
                {
                    "checker":    r.checker_name,
                    "category":   r.category.value,
                    "passed":     r.passed,
                    "errors":     r.error_count,
                    "warnings":   r.warning_count,
                    "violations": [v.to_dict() for v in r.violations],
                }
                for r in self.results
            ],
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=indent)

    def print_summary(self) -> None:
        status = "✅ ПРОШЁЛ" if self.passed else "❌ НЕ ПРОШЁЛ"
        print(f"\n{'='*60}")
        print(f"  Документ: {self.document_name}")
        print(f"  Статус:   {status}  |  Страниц: {self.page_count}")
        if self.skip_pages:
            print(f"  Пропущено страниц: {sorted(self.skip_pages)}")
        print(f"  Ошибок:   {self.total_errors}  |  Предупреждений: {self.total_warnings}")
        print(f"{'='*60}")

        for result in self.results:
            if not result.violations:
                continue
            from collections import defaultdict
            groups: dict[str, list] = defaultdict(list)
            for v in result.violations:
                groups[v.rule_id].append(v)

            print(f"\n[{result.category.value.upper()}] {result.checker_name}")
            print(f"  {'─'*54}")

            for rule_id, violations in groups.items():
                first = violations[0]
                icon = "🔴" if first.severity == Severity.ERROR else "🟡"
                if len(violations) == 1:
                    print(f"  {icon} [{rule_id}] {first.message}")
                    if first.location:
                        print(f"       📍 {first.location}")
                    if first.context:
                        print(f"       💬 «{first.context[:80]}»")
                    if first.suggestion:
                        print(f"       💡 {first.suggestion}")
                else:
                    print(f"  {icon} [{rule_id}] {first.message}  ({len(violations)} мест)")
                    if first.suggestion:
                        print(f"       💡 {first.suggestion}")
                    for v in violations:
                        loc = v.location or "—"
                        ctx = f" | «{v.context[:50]}»" if v.context else ""
                        print(f"       • {loc}{ctx}")
        print()
