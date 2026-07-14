from typing import Any, Dict

from app.database.supabase_client import supabase_client


def _load_system_settings() -> Dict[str, str]:
    try:
        response = supabase_client.table("system_settings").select("key,value").execute()
        rows = response.data or []
        return {
            str(item.get("key", "")).strip(): str(item.get("value", "") or "").strip()
            for item in rows
            if item.get("key")
        }
    except Exception:
        return {}


def refresh_runtime_settings() -> None:
    return None


def get_runtime_setting(key: str, default: str = "") -> str:
    return _load_system_settings().get(key, default)


def get_runtime_config(prefix: str) -> Dict[str, str]:
    normalized_prefix = prefix.rstrip(".") + "."
    config: Dict[str, str] = {}
    for key, value in _load_system_settings().items():
      if key.startswith(normalized_prefix):
            config[key[len(normalized_prefix):]] = value
    return config


def get_secret_value(key: str, env_value: str = "", default: str = "") -> str:
    setting_value = get_runtime_setting(key, "").strip()
    if setting_value:
        return setting_value
    return (env_value or default or "").strip()
