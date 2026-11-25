import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import Base, get_db
import app.services.ingestion as ingestion_module
from app.main import app
from app.models.user import User
from app.core.security import get_password_hash, create_access_token

# Test database using a separate SQLite file
TEST_DB_FILE = "./test_researchvault.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)


@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Point ingestion worker SessionLocal to test database during testing
ingestion_module.SessionLocal = TestingSessionLocal


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers(db_session):
    user = db_session.query(User).filter(User.email == "test_author@vault.edu").first()
    if not user:
        user = User(
            name="Test Author",
            email="test_author@vault.edu",
            hashed_password=get_password_hash("secure_password_123"),
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    token = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}", "User-Id": str(user.id)}


@pytest.fixture
def auth_headers_user2(db_session):
    user = db_session.query(User).filter(User.email == "other_researcher@vault.edu").first()
    if not user:
        user = User(
            name="Other Researcher",
            email="other_researcher@vault.edu",
            hashed_password=get_password_hash("secure_password_456"),
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    token = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}", "User-Id": str(user.id)}
