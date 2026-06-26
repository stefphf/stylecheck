"""
Удаление битых записей Relationship в DOCX (Target пустой / NULL и т.п.).

Такие файлы иногда создаёт Word с дополнениями; python-docx падает с
KeyError: "There is no item named 'word/NULL' in the archive".
"""

from __future__ import annotations

import io
import zipfile
from xml.etree import ElementTree as ET

_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
_REL_TAG = f"{{{_REL_NS}}}Relationship"


def _bad_relationship_target(target: str | None) -> bool:
    if target is None:
        return True
    t = target.strip()
    if not t:
        return True
    norm = t.replace("\\", "/").lower()
    last = norm.rsplit("/", 1)[-1]
    if last in ("null", "(null)"):
        return True
    if norm == "null":
        return True
    return False


def _strip_bad_relationships_from_rels_xml(data: bytes) -> bytes:
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        return data

    removed = False
    for child in list(root):
        if child.tag != _REL_TAG:
            continue
        if _bad_relationship_target(child.get("Target")):
            root.remove(child)
            removed = True

    if not removed:
        return data

    ET.register_namespace("", _REL_NS)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def sanitize_docx_bytes(content: bytes) -> bytes:
    """
    Возвращает копию DOCX без Relationship с невалидным Target.
    Не DOCX / повреждённый ZIP — пробрасывает исключение zipfile.
    """
    src = io.BytesIO(content)
    out = io.BytesIO()
    with zipfile.ZipFile(src, "r") as zin, zipfile.ZipFile(out, "w") as zout:
        for info in zin.infolist():
            raw = zin.read(info.filename)
            if info.filename.endswith(".rels"):
                raw = _strip_bad_relationships_from_rels_xml(raw)
            zout.writestr(info, raw)
    return out.getvalue()
