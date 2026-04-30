from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    github_token: str
    github_repo: str
    github_branch: str = "main"

    gemini_api_key: str
    gemini_model: str = "gemini-2.5-flash"

    api_key: str

    # Google OAuth
    google_client_id: str = ""
    allowed_emails: str = ""  # comma-separated list of allowed emails

    # CORS
    allowed_origins: str = ""  # comma-separated list of extra allowed origins

    telegram_bot_token: str = ""
    telegram_allowed_user_id: int = 0

    # URL pubblico del backend (per webhook Telegram)
    backend_url: str = ""

    @property
    def allowed_emails_list(self) -> list[str]:
        if not self.allowed_emails:
            return []
        return [e.strip() for e in self.allowed_emails.split(",") if e.strip()]

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
