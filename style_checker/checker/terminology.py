"""
checker/terminology.py — проверка терминологии.
"""

import re
from .base import BaseChecker
from ..models.report import CheckCategory, Severity
from ..core.document import ParsedDocument

try:
    import pymorphy3
    _morph = pymorphy3.MorphAnalyzer()
    _MORPH_AVAILABLE = True
except ImportError:
    _MORPH_AVAILABLE = False


def _lemmatize(word: str) -> str:
    if _MORPH_AVAILABLE:
        return _morph.parse(word.lower())[0].normal_form
    return word.lower()


def _find_in_text(phrase: str, text: str) -> list[str]:
    words = phrase.lower().split()
    if not words:
        return []
    pattern = r"\b" + r"\s+".join(re.escape(w) for w in words) + r"\b"
    matches = re.findall(pattern, text, re.IGNORECASE)
    if matches:
        return matches
    if _MORPH_AVAILABLE:
        phrase_lemma = " ".join(_lemmatize(w) for w in words)
        tokens = re.findall(r"\b\w+\b", text)
        n = len(phrase_lemma.split())
        found = []
        for i in range(len(tokens) - n + 1):
            window = tokens[i:i + n]
            if " ".join(_lemmatize(t) for t in window) == phrase_lemma:
                found.append(" ".join(window))
        return found
    return []


class TerminologyChecker(BaseChecker):

    @property
    def name(self) -> str:
        return "Проверка терминологии"

    @property
    def category(self) -> CheckCategory:
        return CheckCategory.TERMINOLOGY

    def check(self, document: ParsedDocument):
        result = self._result()
        cfg = self.config
        paragraphs = document.non_empty_paragraphs

        # 1. Запрещённые термины
        for entry in cfg.get("forbidden_terms", []):
            term       = entry.get("term", "")
            reason     = entry.get("reason", "")
            suggestion = entry.get("suggestion", "")
            severity   = Severity(entry.get("severity", "warning"))
            for para in paragraphs:
                if _find_in_text(term, para.text):
                    result.violations.append(self._violation(
                        rule_id="TERM-FORBIDDEN", severity=severity,
                        message=f"Запрещённый термин: «{term}»" + (f" — {reason}" if reason else ""),
                        suggestion=suggestion or f"Замените «{term}» на корректный термин",
                        para=para,
                    ))
                else:
                    result.passed += 1

        # 2. Обязательные термины
        full_text = " ".join(p.text for p in paragraphs)
        for entry in cfg.get("required_terms", []):
            term     = entry.get("term", "")
            reason   = entry.get("reason", "")
            severity = Severity(entry.get("severity", "info"))
            if _find_in_text(term, full_text):
                result.passed += 1
            else:
                result.violations.append(self._violation(
                    rule_id="TERM-REQUIRED", severity=severity,
                    message=f"Обязательный термин не найден: «{term}»" + (f" — {reason}" if reason else ""),
                    suggestion=f"Используйте термин «{term}» в документе",
                ))

        # 3. Предпочтительные замены
        for entry in cfg.get("preferred_replacements", []):
            avoid    = entry.get("avoid", "")
            prefer   = entry.get("prefer", "")
            severity = Severity(entry.get("severity", "warning"))
            for para in paragraphs:
                if _find_in_text(avoid, para.text):
                    result.violations.append(self._violation(
                        rule_id="TERM-PREFERRED", severity=severity,
                        message=f"Нежелательный термин: «{avoid}»",
                        suggestion=f"Рекомендуется заменить на «{prefer}»",
                        para=para,
                    ))
                else:
                    result.passed += 1

        return result
