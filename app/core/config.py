from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Unfinial AI API"
    database_url: str = "sqlite:///./unfinial.db"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 24
    password_hash_iterations: int = 210_000
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    cors_origin_regex: str | None = r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
