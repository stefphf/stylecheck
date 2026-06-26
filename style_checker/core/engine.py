"""
core/engine.py — движок проверки документов.
"""

from ..core.document import DocumentParser, ParsedDocument
from ..core.docx_sanitize import sanitize_docx_bytes
from ..models.report import Report
from ..checker.base import BaseChecker
from ..checker.structure import StructureChecker
from ..checker.terminology import TerminologyChecker
from ..checker.formatting import FormattingChecker
from ..checker.gost_page import GostPageChecker
from io import BytesIO


class CheckEngine:
    _CHECKER_REGISTRY: dict[str, type[BaseChecker]] = {
        "structure":   StructureChecker,
        "terminology": TerminologyChecker,
        "formatting":  FormattingChecker,
    }
    _SOURCE_CHECKER_REGISTRY: dict[str, type] = {
        "gost_page": GostPageChecker,
    }

    def __init__(self, config: dict):
        self.config = config
        self.parser = DocumentParser()

    def _build_checkers(self, source=None) -> list[BaseChecker]:
        all_known = list(self._CHECKER_REGISTRY.keys()) + list(self._SOURCE_CHECKER_REGISTRY.keys())
        enabled = self.config.get("enabled_checkers", all_known)
        checkers = []
        for name in enabled:
            checker_config = self.config.get(name, {})
            if name in self._CHECKER_REGISTRY:
                checkers.append(self._CHECKER_REGISTRY[name](checker_config))
            elif name in self._SOURCE_CHECKER_REGISTRY and source is not None:
                checkers.append(
                    self._SOURCE_CHECKER_REGISTRY[name](checker_config, docx_source=source)
                )
        return checkers

    def register_checker(self, name: str, checker_class: type[BaseChecker]) -> None:
        self._CHECKER_REGISTRY[name] = checker_class

    def run(self, source, filename: str = "document.docx",
            skip_pages: set[int] = None) -> Report:
        if isinstance(source, str):
            with open(source, "rb") as f:
                source_bytes = f.read()
        elif isinstance(source, bytes):
            source_bytes = source
        else:
            source_bytes = source.read()

        # DOCX с битыми связями (Target=NULL в .rels) — python-docx иначе падает при чтении ZIP
        source_bytes = sanitize_docx_bytes(source_bytes)

        document = self.parser.parse(BytesIO(source_bytes), skip_pages=skip_pages or set())
        checkers = self._build_checkers(source=BytesIO(source_bytes))
        return self._run_checkers(checkers, document, filename)

    def _run_checkers(self, checkers, document: ParsedDocument, filename: str) -> Report:
        report = Report(document_name=filename,
                        page_count=document.page_count,
                        skip_pages=list(document.skip_pages))
        for checker in checkers:
            try:
                result = checker.check(document)
                report.results.append(result)
            except Exception as exc:
                from ..models.report import CheckResult, Violation, Severity
                err_result = CheckResult(checker_name=checker.name, category=checker.category)
                err_result.violations.append(Violation(
                    rule_id="ENGINE-CHECKER-ERROR",
                    category=checker.category,
                    severity=Severity.ERROR,
                    message=f"Внутренняя ошибка чекера: {exc}",
                ))
                report.results.append(err_result)
        return report
