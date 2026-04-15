from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import hashlib
import secrets

# This creates a file called quanscan.db in your backend folder
DATABASE_URL = "sqlite:///./quanscan.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# ── Password hashing utilities ─────────────────────────────────────────────
def hash_password(password: str, salt: str = None) -> tuple:
    """Hash a password with a random salt. Returns (hash, salt)."""
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        'sha256', password.encode('utf-8'), salt.encode('utf-8'), 100_000
    )
    return hashed.hex(), salt

def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """Verify a password against a stored hash and salt."""
    computed_hash, _ = hash_password(password, salt)
    return computed_hash == stored_hash

# ── User model ─────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id                  = Column(Integer, primary_key=True, index=True)
    username            = Column(String, unique=True, index=True, nullable=False)
    email               = Column(String, unique=True, index=True, nullable=False)
    full_name           = Column(String, nullable=False)
    password_hash       = Column(String, nullable=False)
    password_salt       = Column(String, nullable=False)
    role                = Column(String, default="analyst")  # admin / analyst
    security_question   = Column(String, nullable=True)
    security_answer_hash = Column(String, nullable=True)
    security_answer_salt = Column(String, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    last_login          = Column(DateTime, nullable=True)

# This is our main table — one row per scanned asset
class ScanResult(Base):
    __tablename__ = "scan_results"

    id            = Column(Integer, primary_key=True, index=True)
    host          = Column(String, index=True)
    ip_address    = Column(String, nullable=True)
    port          = Column(Integer, default=443)
    asset_type    = Column(String, default="Web Server")

    # TLS info
    tls_version   = Column(String, nullable=True)
    cipher_suite  = Column(String, nullable=True)
    key_exchange  = Column(String, nullable=True)

    # Certificate info
    cert_subject     = Column(String, nullable=True)
    cert_issuer      = Column(String, nullable=True)
    cert_algo        = Column(String, nullable=True)
    cert_key_size    = Column(Integer, nullable=True)
    cert_expiry      = Column(String, nullable=True)
    cert_valid_from  = Column(String, nullable=True)
    cert_status      = Column(String, nullable=True)  # Valid / Expiring / Expired

    # PQC evaluation
    pqc_score     = Column(Float, default=0.0)
    pqc_label     = Column(String, default="Unknown")  # Elite / Standard / Legacy / Critical
    hndl_risk     = Column(String, default="Unknown")  # High / Low
    is_pqc_ready  = Column(Integer, default=0)         # 0 = No, 1 = Yes
    # Pillar scores
    pillar1 = Column(Integer, default=0)  # Inventory & Visibility
    pillar2 = Column(Integer, default=0)  # Risk Analysis
    pillar3 = Column(Integer, default=0)  # Technical Implementation

    # Recommendations
    recommendations = Column(Text, nullable=True)      # stored as JSON string

    # Meta
    scan_timestamp = Column(DateTime, default=datetime.utcnow)

def create_tables():
    Base.metadata.create_all(bind=engine)
    # Seed default admin user if no users exist
    _seed_default_admin()

def _seed_default_admin():
    """Create a default admin account on first run."""
    db = SessionLocal()
    try:
        existing = db.query(User).first()
        if existing is None:
            pwd_hash, pwd_salt = hash_password("QuantScan@2026")
            ans_hash, ans_salt = hash_password("jodhpur")
            admin = User(
                username="admin",
                email="admin@quantscan.local",
                full_name="QuantScan Admin",
                password_hash=pwd_hash,
                password_salt=pwd_salt,
                role="admin",
                security_question="What city is M.B.M University in?",
                security_answer_hash=ans_hash,
                security_answer_salt=ans_salt,
            )
            db.add(admin)
            db.commit()
            print("[SEED] Default admin user seeded (admin / QuantScan@2026)")
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()