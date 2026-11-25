from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ResearchVault"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "researchvault_super_secret_jwt_key_change_in_production_1234567890"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    DATABASE_URL: str = "sqlite:///./researchvault.db"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50 MB in bytes
    CHUNK_TARGET_TOKENS: int = 800
    CHUNK_OVERLAP_TOKENS: int = 120
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx", ".txt"]

    # Phase 3: Semantic & Hybrid Search
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    CHROMA_PERSIST_DIRECTORY: str = "chroma_db"
    CHROMA_COLLECTION_NAME: str = "research_vault_chunks"
    RRF_K: int = 60

    # Phase 4: Advanced Reranking
    RERANKER_MODEL_NAME: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
