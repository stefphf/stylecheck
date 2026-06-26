"""
checker/structure.py
Проверка структуры документа:
  - наличие обязательных разделов
  - нумерация заголовков
  - иерархия уровней (нельзя прыгать с H1 сразу на H3)
  - минимальный объём разделов
"""

import re
from .base import BaseChecker
from ..models.report import CheckCategory, Severity
from ..core.document import ParsedDocument


class StructureChecker(BaseChecker):

    @property
    def name(self) -> str:
        return "Проверка структуры"

    @property
    def category(self) -> CheckCategory:
        return CheckCategory.STRUCTURE

    def check(self, document: ParsedDocument):
        result = self._result()
        cfg = self.config

        headings = document.headings
        heading_texts = [h.text.strip() for h in headings]

        # ── 1. Обязательные разделы ─────────────────────────────────
        required_sections = cfg.get("required_sections", [])
        for section in required_sections:
            pattern = section.get("pattern", "")
            label   = section.get("label", pattern)
            severity = Severity(section.get("severity", "error"))

            found = any(
                re.search(pattern, text, re.IGNORECASE)
                for text in heading_texts
            )
            if found:
                result.passed += 1
            else:
                result.violations.append(self._violation(
                    rule_id=f"STRUCT-REQUIRED-{label[:20].upper().replace(' ', '_')}",
                    severity=severity,
                    message=f"Обязательный раздел не найден: «{label}»",
                    suggestion=f"Добавьте раздел «{label}» в документ",
                ))

        # ── 2. Иерархия заголовков (нет пропусков уровней) ─────────
        if cfg.get("check_heading_hierarchy", True):
            prev_level = 0
            for h in headings:
                if h.level and h.level > prev_level + 1:
                    result.violations.append(self._violation(
                        rule_id="STRUCT-HIERARCHY",
                        severity=Severity.WARNING,
                        message=(
                            f"Нарушена иерархия заголовков: "
                            f"H{h.level} после H{prev_level}"
                        ),
                        location=f"Параграф #{h.index}: «{h.text[:50]}»",
                        suggestion="Не пропускайте уровни заголовков",
                    ))
                else:
                    result.passed += 1
                if h.level:
                    prev_level = h.level

        # ── 3. Нумерация заголовков первого уровня ──────────────────
        if cfg.get("check_top_level_numbering", False):
            h1_list = document.headings_by_level(1)
            for idx, h in enumerate(h1_list, start=1):
                # Ожидаем, что заголовок начинается с числа
                if not re.match(r"^\d", h.text.strip()):
                    result.violations.append(self._violation(
                        rule_id="STRUCT-NUMBERING",
                        severity=Severity.WARNING,
                        message=f"Заголовок первого уровня не начинается с номера",
                        location=f"Параграф #{h.index}: «{h.text[:50]}»",
                        suggestion="Заголовки должны быть пронумерованы (1, 2, 3…)",
                    ))
                else:
                    result.passed += 1

        # ── 4. Документ не пустой ────────────────────────────────────
        min_paragraphs = cfg.get("min_paragraphs", 3)
        actual = len(document.non_empty_paragraphs)
        if actual < min_paragraphs:
            result.violations.append(self._violation(
                rule_id="STRUCT-EMPTY",
                severity=Severity.ERROR,
                message=f"Документ слишком короткий: {actual} параграфов (минимум {min_paragraphs})",
                suggestion="Добавьте содержимое документа",
            ))
        else:
            result.passed += 1

        # ── 5. Наличие хотя бы одного заголовка ─────────────────────
        if cfg.get("require_headings", True):
            if not headings:
                result.violations.append(self._violation(
                    rule_id="STRUCT-NO-HEADINGS",
                    severity=Severity.ERROR,
                    message="В документе нет ни одного заголовка",
                    suggestion="Используйте стили 'Heading 1', 'Heading 2' для заголовков",
                ))
            else:
                result.passed += 1

        return result
