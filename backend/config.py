from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    GEMINI_API_KEY: Optional[str] = None
    DATABASE_URL: str = "sqlite:///./civic_radar.db"
    UPLOAD_DIR: str = "uploads"
    APP_NAME: str = "CivicNova AI"
    DEBUG: bool = True
    ALLOWED_ORIGINS: Optional[str] = None
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
