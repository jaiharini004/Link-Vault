import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")


def fix_database_url(url: str) -> str:
    """SQLAlchemy 1.4+ compatibility fix for postgres:// scheme."""
    if url and url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


# Supabase default connection URI (Placeholder, should be overridden by .env)
DEFAULT_SUPABASE_URL = "postgresql://postgres.your_project_ref:your_password@aws-0-region.pooler.supabase.com:6543/postgres"


class Config:
    """Base Configuration for Supabase PostgreSQL."""
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-linkvault-2026")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")


class DevelopmentConfig(Config):
    """Development Configuration (Supabase)."""
    DEBUG = True
    raw_db_url = os.getenv("DATABASE_URL", DEFAULT_SUPABASE_URL)
    SQLALCHEMY_DATABASE_URI = fix_database_url(raw_db_url)


class ProductionConfig(Config):
    """Production Configuration (Supabase)."""
    DEBUG = False
    raw_db_url = os.getenv("DATABASE_URL", DEFAULT_SUPABASE_URL)
    SQLALCHEMY_DATABASE_URI = fix_database_url(raw_db_url)


class TestingConfig(Config):
    """Testing Configuration (Supabase test database)."""
    TESTING = True
    DEBUG = True
    raw_db_url = os.getenv("TEST_DATABASE_URL", "postgresql://postgres.your_project_ref:your_password@aws-0-region.pooler.supabase.com:6543/test_postgres")
    SQLALCHEMY_DATABASE_URI = fix_database_url(raw_db_url)


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
