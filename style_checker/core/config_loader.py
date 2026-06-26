"""
core/config_loader.py
Загрузка и валидация конфига правил.
Конфиг можно хранить в JSON-файле (на диске) или в БД (для веб-сервиса).
"""

import json
import os
from pathlib import Path


DEFAULT_CONFIG_PATH = Path(__file__).parent.parent / "config" / "rules.json"


def load_config(path: str | Path | None = None) -> dict:
    """
    Загружает конфиг правил из JSON-файла.
    
    Args:
        path: путь к файлу конфига. Если None — используется rules.json из пакета.
        
    Returns:
        Словарь с конфигом.
    """
    config_path = Path(path) if path else DEFAULT_CONFIG_PATH

    if not config_path.exists():
        raise FileNotFoundError(f"Файл конфига не найден: {config_path}")

    with open(config_path, encoding="utf-8") as f:
        return json.load(f)


def load_config_from_dict(data: dict) -> dict:
    """
    Принимает конфиг как словарь (например, из БД).
    Используется в веб-сервисе: администратор меняет правила через UI,
    они сохраняются в БД, при каждой проверке загружаются оттуда.
    """
    return data


def merge_configs(base: dict, override: dict) -> dict:
    """
    Слияние конфигов: base + override.
    Используется, когда у организации есть базовый конфиг
    и пользовательские дополнения.
    """
    result = base.copy()
    for key, value in override.items():
        if isinstance(value, dict) and key in result and isinstance(result[key], dict):
            result[key] = merge_configs(result[key], value)
        elif isinstance(value, list) and key in result and isinstance(result[key], list):
            result[key] = result[key] + value  # Объединяем списки
        else:
            result[key] = value
    return result
