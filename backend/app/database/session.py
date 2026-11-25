from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# If using SQLite, set check_same_thread=False and 30s timeout
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    connect_args["timeout"] = 30.0

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db(target_engine=None):
    """
    Ensure tables are created and migrate any missing columns for SQLite.
    """
    import app.models  # ensure all models register with Base.metadata
    eng = target_engine or engine
    Base.metadata.create_all(bind=eng)
    try:
        with eng.connect() as conn:
            if eng.dialect.name == "sqlite":
                res = conn.exec_driver_sql("PRAGMA table_info(documents)").fetchall()
                existing_cols = {r[1] for r in res}
                if existing_cols:
                    if "domain" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE documents ADD COLUMN domain VARCHAR(100) DEFAULT 'Computer Science'")
                    if "document_type" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE documents ADD COLUMN document_type VARCHAR(50) DEFAULT 'Preprint'")
                    conn.commit()
    except Exception:
        pass


def get_db():
    """Dependency that provides a SQLAlchemy session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
