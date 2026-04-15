from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import json
import base64
from datetime import datetime
from dateutil import parser as dateparser
from database import get_db, create_tables, ScanResult, User, hash_password, verify_password

# ── App setup ──────────────────────────────────────────────────────────────
app = FastAPI(title="QuantScan API", version="1.0.0")

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create DB tables on startup
@app.on_event("startup")
def startup():
    create_tables()
    print("[OK] QuantScan API is running!")
    print("[DOCS] Docs at: http://localhost:8000/docs")

# ── Auth Request/Response models ───────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    security_question: str
    security_answer: str

class LoginRequest(BaseModel):
    username: str
    password: str

class ResetPasswordRequest(BaseModel):
    username: str
    security_answer: str
    new_password: str

# ── Auth helper: create simple token ───────────────────────────────────────
def create_token(user: User) -> str:
    """Create a simple base64-encoded token with user info."""
    payload = json.dumps({
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
    })
    return base64.b64encode(payload.encode()).decode()

def decode_token(token: str) -> dict:
    """Decode a base64 token back to user info."""
    try:
        payload = base64.b64decode(token.encode()).decode()
        return json.loads(payload)
    except Exception:
        return None

# ── AUTH ROUTES ────────────────────────────────────────────────────────────

@app.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Validate input
    if len(req.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    if len(req.full_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Full name is required")
    if not req.security_question or not req.security_answer:
        raise HTTPException(status_code=400, detail="Security question and answer are required")

    # Check if username already exists
    existing_user = db.query(User).filter(User.username == req.username.lower()).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Username already taken")

    # Check if email already exists
    existing_email = db.query(User).filter(User.email == req.email.lower()).first()
    if existing_email:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Hash password and security answer
    pwd_hash, pwd_salt = hash_password(req.password)
    ans_hash, ans_salt = hash_password(req.security_answer.lower().strip())

    user = User(
        username=req.username.lower().strip(),
        email=req.email.lower().strip(),
        full_name=req.full_name.strip(),
        password_hash=pwd_hash,
        password_salt=pwd_salt,
        role="analyst",
        security_question=req.security_question,
        security_answer_hash=ans_hash,
        security_answer_salt=ans_salt,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user)
    return {
        "message": "Account created successfully",
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        }
    }

@app.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username.lower().strip()).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not verify_password(req.password, user.password_hash, user.password_salt):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    token = create_token(user)
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        }
    }

@app.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    user = db.query(User).filter(User.username == req.username.lower().strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify security answer
    if not user.security_answer_hash or not user.security_answer_salt:
        raise HTTPException(status_code=400, detail="No security question set for this account")

    if not verify_password(req.security_answer.lower().strip(), user.security_answer_hash, user.security_answer_salt):
        raise HTTPException(status_code=401, detail="Incorrect security answer")

    # Update password
    new_hash, new_salt = hash_password(req.new_password)
    user.password_hash = new_hash
    user.password_salt = new_salt
    db.commit()

    return {"message": "Password reset successfully. You can now sign in with your new password."}

@app.get("/auth/me")
def get_me(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.replace("Bearer ", "")
    data = decode_token(token)
    if not data:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == data["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "created_at": str(user.created_at),
        "last_login": str(user.last_login) if user.last_login else None,
    }

@app.get("/auth/security-question/{username}")
def get_security_question(username: str, db: Session = Depends(get_db)):
    """Get the security question for a user (used during password reset)."""
    user = db.query(User).filter(User.username == username.lower().strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"security_question": user.security_question}

# ── Scan Request/Response models ────────────────────────────────────────────
class ScanRequest(BaseModel):
    hosts: List[str]        # list of domains to scan
    port: Optional[int] = 443

class ScanResponse(BaseModel):
    message: str
    total: int
    results: list

# ── Helper: save scan result to DB ────────────────────────────────────────
def save_to_db(data: dict, db: Session):
    # Fix: convert string timestamp to datetime object
    scan_time = data.get("scan_timestamp")
    if isinstance(scan_time, str):
        scan_time = datetime.fromisoformat(scan_time)
    else:
        scan_time = datetime.utcnow()

    # Check if host already exists — update instead of duplicate
    existing = db.query(ScanResult).filter(
        ScanResult.host == data["host"]
    ).first()

    allowed_keys = {c.name for c in ScanResult.__table__.columns}

    if existing:
        for key, value in data.items():
            if key in allowed_keys and key not in ["id", "scan_timestamp", "error"]:
                setattr(existing, key, value)
        existing.scan_timestamp = scan_time
        db.commit()
        db.refresh(existing)
        return existing
    else:
        clean = {
            k: v for k, v in data.items()
            if k in allowed_keys and k not in ["error", "scan_timestamp"]
        }
        clean["scan_timestamp"] = scan_time
        record = ScanResult(**clean)
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

# ── ROUTES ─────────────────────────────────────────────────────────────────

# scanning the link subdomain

from scanner import scan_host, scan_with_subdomains

class SubdomainRequest(BaseModel):
    host: str

@app.post("/scan-subdomains")
def scan_subdomains_api(req: SubdomainRequest):
    return scan_with_subdomains(req.host)

# 1. Health check
@app.get("/")
def root():
    return {"status": "QuantScan API running", "version": "1.0.0"}

# 2. Scan one or multiple hosts

@app.post("/scan")
def scan(request: ScanRequest, db: Session = Depends(get_db)):
    results = []
    errors  = []

    for host in request.hosts:
        host = host.strip().lower()
        host = host.replace("https://", "").replace("http://", "").split("/")[0]

        # ✅ Just scan the entered host directly — no subdomain expansion
        print(f"[SCAN] Scanning {host}...")
        data = scan_host(host)

        if data.get("error"):
            errors.append({"host": host, "error": data["error"]})
        else:
            record = save_to_db(data, db)
            results.append(format_result(record))
       

    return {
        "message": f"Scanned {len(results)} hosts successfully",
        "total": len(results),
        "errors": errors,
        "results": results
    }

# 3. Get all scan results
@app.get("/assets")
def get_assets(db: Session = Depends(get_db)):
    records = db.query(ScanResult).order_by(
        ScanResult.scan_timestamp.desc()
    ).all()
    return {"total": len(records), "assets": [format_result(r) for r in records]}

# 4. Get single asset by host
@app.get("/assets/{host}")
def get_asset(host: str, db: Session = Depends(get_db)):
    record = db.query(ScanResult).filter(
        ScanResult.host == host
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Host not found — scan it first")
    return format_result(record)

# 5. Delete an asset
@app.delete("/assets/{host}")
def delete_asset(host: str, db: Session = Depends(get_db)):
    record = db.query(ScanResult).filter(
        ScanResult.host == host
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Host not found")
    db.delete(record)
    db.commit()
    return {"message": f"{host} deleted successfully"}

# 6. Dashboard summary stats
@app.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    all_assets = db.query(ScanResult).all()
    total      = len(all_assets)

    if total == 0:
        return {"message": "No assets scanned yet", "total": 0}

    pqc_ready = sum(1 for a in all_assets if a.pqc_label in ["Quantum-Safe", "PQC-Ready"])
    critical = sum(1 for a in all_assets if a.pqc_label == "Critical Risk")
    transitional = sum(1 for a in all_assets if a.pqc_label == "Transitional Risk")
    modern_secure = sum(1 for a in all_assets if a.pqc_label == "Modern Secure (Not PQC Ready)")
    expiring = sum(1 for a in all_assets if a.cert_status in ["Expiring", "Expiring Soon"])
    expired = sum(1 for a in all_assets if a.cert_status == "Expired")
    hndl_exposed = sum(1 for a in all_assets if a.hndl_risk == "High")
    avg_score = round(sum(a.pqc_score for a in all_assets) / total, 1)

    risk_breakdown = {
        "Quantum-Safe": sum(1 for a in all_assets if a.pqc_label == "Quantum-Safe"),
        "PQC-Ready": sum(1 for a in all_assets if a.pqc_label == "PQC-Ready"),
        "Modern Secure (Not PQC Ready)": modern_secure,
        "Transitional Risk": transitional,
        "Critical Risk": critical,
    }

    # Cyber rating (0-1000 normalized)
    cyber_rating = round((avg_score / 100) * 1000)
    if cyber_rating >= 700:
        cyber_tier = "Elite-PQC"
    elif cyber_rating >= 400:
        cyber_tier = "Standard"
    else:
        cyber_tier = "Legacy"

    # Asset type breakdown
    type_breakdown = {}
    for a in all_assets:
        t = a.asset_type or "Unknown"
        type_breakdown[t] = type_breakdown.get(t, 0) + 1

    

    return {
        "total_assets":   total,
        "pqc_ready":      pqc_ready,
        "vulnerable": transitional + critical,
        "expiring_certs": expiring,
        "expired_certs":  expired,
        "hndl_exposed":   hndl_exposed,
        "avg_pqc_score":  avg_score,
        "cyber_rating":   cyber_rating,
        "cyber_tier":     cyber_tier,
        "type_breakdown": type_breakdown,
        "risk_breakdown": risk_breakdown,
    }

# 7. CBOM export
@app.get("/cbom")
def get_cbom(db: Session = Depends(get_db)):
    assets = db.query(ScanResult).all()
    cbom = {
        "bomFormat":   "CycloneDX",
        "specVersion": "1.6",
        "version":     1,
        "metadata": {
            "timestamp": datetime.utcnow().isoformat(),
            "tool":      "QuantScan by Cipher Sen — M.B.M University"
        },
        "components": []
    }
    for a in assets:
        cbom["components"].append({
            "type":      "cryptographic-asset",
            "name":      a.host,
            "assetType": a.asset_type,
            "properties": {
                "tls_version":  a.tls_version,
                "cipher_suite": a.cipher_suite,
                "key_exchange": a.key_exchange,
                "cert_algo":    a.cert_algo,
                "cert_key_size": a.cert_key_size,
                "cert_expiry":  a.cert_expiry,
                "cert_status":  a.cert_status,
                "pqc_score":    a.pqc_score,
                "pqc_label":    a.pqc_label,
                "hndl_risk":    a.hndl_risk,
                "is_pqc_ready": a.is_pqc_ready,
            },
            "recommendations": json.loads(a.recommendations or "[]")
        })
    return cbom

# ── Format DB record for API response ─────────────────────────────────────
def format_result(r: ScanResult) -> dict:
    return {
        "id":            r.id,
        "host":          r.host,
        "ip_address":    r.ip_address,
        "port":          r.port,
        "asset_type":    r.asset_type,
        "tls_version":   r.tls_version,
        "cipher_suite":  r.cipher_suite,
        "key_exchange":  r.key_exchange,
        "cert_subject":  r.cert_subject,
        "cert_issuer":   r.cert_issuer,
        "cert_algo":     r.cert_algo,
        "cert_key_size": r.cert_key_size,
        "cert_expiry":   r.cert_expiry,
        "cert_valid_from": r.cert_valid_from,
        "cert_status":   r.cert_status,
        "pqc_score":     r.pqc_score,
        "pqc_label":     r.pqc_label,
        "hndl_risk":     r.hndl_risk,
        "is_pqc_ready":  r.is_pqc_ready,
        "recommendations": json.loads(r.recommendations or "[]"),
        "scan_timestamp": str(r.scan_timestamp),
        "pillar1": r.pillar1,
        "pillar2": r.pillar2,
        "pillar3": r.pillar3,
    }