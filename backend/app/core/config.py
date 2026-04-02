from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "G-MKT AI"
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    
    # DB
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "mkt_user"
    POSTGRES_PASSWORD: str = "mkt_password"
    POSTGRES_DB: str = "mkt_db"
    POSTGRES_PORT: str = "5432"
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # AI 
    GEMINI_API_KEY: str = ""
    
    # OAuth Meta
    META_CLIENT_ID: str = ""
    META_CLIENT_SECRET: str = ""
    META_REDIRECT_URI: str = "http://localhost:8000/api/auth/meta/callback"
    
    # OAuth TikTok
    TIKTOK_CLIENT_KEY: str = ""
    TIKTOK_CLIENT_SECRET: str = ""
    TIKTOK_REDIRECT_URI: str = "http://localhost:8000/api/auth/tiktok/callback"
    
    class Config:
        env_file = ".env"

settings = Settings()
