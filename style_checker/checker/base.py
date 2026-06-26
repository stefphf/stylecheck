"""
checker/base.py — базовый класс для всех чекеров.
"""

from abc import ABC, abstractmethod
from ..models.report import CheckResult, CheckCategory, Violation, Severity
from ..core.document import ParsedDocument, Paragraph


class BaseChecker(ABC):
    def __init__(self, config: dict):
        self.config = config

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def category(self) -> CheckCategory: ...

    @abstractmethod
    def check(self, document: ParsedDocument) -> CheckResult: ...

    def _result(self) -> CheckResult:
        return CheckResult(checker_name=self.name, category=self.category)

    def _violation(
        self,
        rule_id:    str,
        severity:   Severity,
        message:    str,
        location:   str | None = None,
        suggestion: str | None = None,
        context:    str | None = None,
        para:       Paragraph | None = None,   # ← если передан, извлекаем всё автоматически
    ) -> Violation:
        """
        Создаёт нарушение. Если передан para — автоматически заполняет
        location, page_number, para_on_page, context, global_index.
        """
        if para is not None:
            location     = location or para.location_str
            context      = context or para.context_preview
            page_number  = para.page_number
            para_on_page = para.para_on_page
            global_index = para.index
            in_table     = para.in_table
            is_image     = para.is_image
        else:
            page_number = para_on_page = global_index = None
            in_table = is_image = False

        return Violation(
            rule_id=rule_id,
            category=self.category,
            severity=severity,
            message=message,
            location=location,
            page_number=page_number,
            para_on_page=para_on_page,
            suggestion=suggestion,
            context=context,
            global_index=global_index,
            in_table=in_table,
            is_image=is_image,
        )
