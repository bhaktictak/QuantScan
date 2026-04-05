from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# This creates a file called quanscan.db in your backend folder
DATABASE_URL = "sqlite:///./quanscan.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()