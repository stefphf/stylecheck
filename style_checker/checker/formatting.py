"""
checker/formatting.py — проверка правил оформления.
"""

import re
from .base import BaseChecker
from ..models.report import CheckCategory, Severity
from ..core.document import ParsedDocument


class FormattingChecker(BaseChecker):

    @property
    def name(self) -> str:
        return "Проверка оформления"

    @property
    def category(self) -> CheckCategory:
        return CheckCategory.FORMATTING

    def check(self, document: ParsedDocument):
        result = self._result()
        cfg = self.config
        paragraphs = document.non_empty_paragraphs
        headings   = document.headings
        text_paras = document.text_paragraphs()

        # 1. Двойные пробелы
        if cfg.get("no_double_spaces", True):
            for para in paragraphs:
                if "  " in para.text:
                    result.violations.append(self._violation(
                        rule_id="FMT-DOUBLE-SPACE", severity=Severity.WARNING,
                        message="Двойные пробелы в тексте",
                        suggestion="Уберите лишние пробелы", para=para,
                    ))
                else:
                    result.passed += 1

        # 2. Точка в конце заголовка
        if cfg.get("no_period_in_headings", True):
            for para in headings:
                if para.text.strip().endswith("."):
                    result.violations.append(self._violation(
                        rule_id="FMT-HEADING-PERIOD", severity=Severity.WARNING,
                        message="Заголовок не должен заканчиваться точкой",
                        suggestion="Уберите точку в конце заголовка", para=para,
                    ))
                else:
                    result.passed += 1

        # 3. Длина параграфов
        max_len = cfg.get("max_paragraph_length")
        min_len = cfg.get("min_paragraph_length")
        if max_len or min_len:
            for para in text_paras:
                words = len(para.text.split())
                if max_len and words > max_len:
                    result.violations.append(self._violation(
                        rule_id="FMT-PARA-TOO-LONG", severity=Severity.INFO,
                        message=f"Параграф слишком длинный: {words} слов (максимум {max_len})",
                        suggestion="Разбейте параграф на несколько частей", para=para,
                    ))
                elif min_len and words < min_len:
                    result.violations.append(self._violation(
                        rule_id="FMT-PARA-TOO-SHORT", severity=Severity.INFO,
                        message=f"Параграф слишком короткий: {words} слов (минимум {min_len})",
                        para=para,
                    ))
                else:
                    result.passed += 1

        # 4. Запрещённые паттерны
        for rule in cfg.get("forbidden_patterns", []):
            pattern    = rule.get("pattern", "")
            message    = rule.get("message", f"Запрещённый паттерн: {pattern}")
            suggestion = rule.get("suggestion", "")
            severity   = Severity(rule.get("severity", "warning"))
            apply_to   = rule.get("apply_to", "all")
            targets = headings if apply_to == "headings" else (text_paras if apply_to == "body" else paragraphs)
            for para in targets:
                if re.search(pattern, para.text):
                    result.violations.append(self._violation(
                        rule_id="FMT-PATTERN", severity=severity,
                        message=message, suggestion=suggestion, para=para,
                    ))
                else:
                    result.passed += 1

        # 5. Заглавная буква
        if cfg.get("check_sentence_capitalization", False):
            for para in text_paras:
                # Пропускаем параграфы в таблицах — там часто ячейки без заглавной
                if para.in_table:
                    continue
                text = para.text.strip()
                if text and text[0].islower():
                    result.violations.append(self._violation(
                        rule_id="FMT-CAPITALIZATION", severity=Severity.WARNING,
                        message="Параграф начинается со строчной буквы",
                        suggestion="Начинайте параграф с заглавной буквы", para=para,
                    ))
                else:
                    result.passed += 1

        # 6. Латиница в русском тексте
        if cfg.get("warn_latin_in_russian", False):
            latin_pattern = re.compile(r"[a-zA-Z]{3,}")
            allowed = cfg.get("allowed_latin_terms", [])
            for para in text_paras:
                matches = [m for m in latin_pattern.findall(para.text) if m not in allowed]
                if matches:
                    result.violations.append(self._violation(
                        rule_id="FMT-LATIN", severity=Severity.INFO,
                        message=f"Латинские слова в тексте: {matches[:5]}",
                        suggestion="Проверьте, можно ли заменить на русский эквивалент",
                        para=para,
                    ))
                else:
                    result.passed += 1

        return result
