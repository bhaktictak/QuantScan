from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import json
from datetime import datetime
from dateutil import parser as dateparser
from database import get_db, create_tables, ScanResult
from scanner import scan_host

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
    print("✅ QuantScan API is running!")
    print("📖 Docs at: http://localhost:8000/docs")

# ── Request/Response models ────────────────────────────────────────────────
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
        # Remove https:// or http:// if user typed it
        host = host.replace("https://", "").replace("http://", "").split("/")[0]

        print(f"🔍 Scanning {host}...")
        data = scan_host(host, request.port)

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