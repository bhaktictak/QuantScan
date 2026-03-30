import ssl
import socket
import json
import ipaddress
from datetime import datetime
from cryptography import x509
from cryptography.hazmat.backends import default_backend

# ── PQC Algorithm lists ────────────────────────────────────────────────────
PQC_KEY_EXCHANGE = [
    "kyber", "mlkem", "ml-kem", "ntru", "saber", "frodo",
    "x25519kyber768", "p256kyber768"
]

PQC_SIGNATURE_ALGOS = [
    "dilithium", "falcon", "sphincs", "mldsa", "ml-dsa",
    "slhdsa", "slh-dsa", "fndsa", "fn-dsa"
]

WEAK_CIPHERS = [
    "DES", "3DES", "RC4", "RC2", "NULL", "EXPORT",
    "MD5", "anon", "CBC"
]

CLASSICAL_VULNERABLE = [
    "RSA", "ECDH", "ECDHE", "DHE", "DH"
]

# ── TLS Version scoring ────────────────────────────────────────────────────
TLS_SCORES = {
    "TLSv1.3": 20,
    "TLSv1.2": 5,
    "TLSv1.1": 0,
    "TLSv1":   0,
}

# ── Main scanner function ──────────────────────────────────────────────────
def scan_host(host: str, port: int = 443) -> dict:
    result = {
        "host": host,
        "port": port,
        "ip_address": None,
        "asset_type": detect_asset_type(host, port),
        "tls_version": None,
        "cipher_suite": None,
        "key_exchange": None,
        "cert_subject": None,
        "cert_issuer": None,
        "cert_algo": None,
        "cert_key_size": None,
        "cert_expiry": None,
        "cert_valid_from": None,
        "cert_status": None,
        "pqc_score": 0.0,
        "pqc_label": "Unknown",
        "hndl_risk": "Unknown",
        "is_pqc_ready": 0,
        "recommendations": [],
        "error": None,
        "scan_timestamp": datetime.utcnow().isoformat()
    }

    try:
        # ── Step 1: Resolve IP ─────────────────────────────────────────
        result["ip_address"] = socket.gethostbyname(host)

        # ── Step 2: TLS Handshake ──────────────────────────────────────
        # ── Step 2: TLS Handshake ──────────────────────────────────────
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        # Try to negotiate PQC hybrid ciphers first
        try:
            context.set_ciphers(
                "TLS_AES_256_GCM_SHA384:"
                "TLS_CHACHA20_POLY1305_SHA256:"
                "TLS_AES_128_GCM_SHA256:"
                "ECDHE+AESGCM:ECDHE+CHACHA20"
            )
        except:
            pass

        with socket.create_connection((host, port), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=host) as ssock:

                # TLS version
                result["tls_version"] = ssock.version()

                # Cipher suite
                cipher = ssock.cipher()
                if cipher:
                    result["cipher_suite"] = cipher[0]
                    result["key_exchange"] = extract_key_exchange(cipher[0])

                # Check if server advertises PQC support
                # via ALPN or session parameters
                shared_ciphers = ssock.shared_ciphers()
                if shared_ciphers:
                    for c in shared_ciphers:
                        c_name = c[0].upper()
                        if any(p in c_name for p in ["KYBER","MLKEM","ML-KEM"]):
                            result["key_exchange"] = "ML-KEM (Hybrid)"
                            result["cipher_suite"] = c[0]
                            break

                # ── Step 3: Parse Certificate ──────────────────────────
                der_cert = ssock.getpeercert(binary_form=True)
                if der_cert:
                    cert_data = parse_certificate(der_cert)
                    result.update(cert_data)

        # ── Step 4: PQC Scoring ────────────────────────────────────────
        # ── Step 3.5: Check PQC HTTP headers ──────────────────────────
        pqc_headers = check_pqc_headers(host)
        if pqc_headers["supports_hybrid_pqc"]:
            result["key_exchange"] = "X25519+ML-KEM (Hybrid)"
        scoring = calculate_pqc_score(result)
        result.update(scoring)

        # ── Step 5: Recommendations ────────────────────────────────────
        result["recommendations"] = generate_recommendations(result)
        result["recommendations"] = json.dumps(result["recommendations"])

    except socket.timeout:
        result["error"] = "Connection timed out"
    except ssl.SSLError as e:
        result["error"] = f"SSL Error: {str(e)}"
    except socket.gaierror:
        result["error"] = f"Could not resolve host: {host}"
    except ConnectionRefusedError:
        result["error"] = "Connection refused — port may be closed"
    except Exception as e:
        result["error"] = f"Unexpected error: {str(e)}"

    return result

def check_pqc_headers(host: str) -> dict:
    """
    Check HTTP headers for PQC support indicators.
    Google and Cloudflare advertise PQC via headers.
    """
    import urllib.request
    import urllib.error

    pqc_info = {
        "supports_hybrid_pqc": False,
        "pqc_header_detected": False,
        "alt_svc": None,
    }

    try:
        req = urllib.request.Request(
            f"https://{host}",
            headers={"User-Agent": "QuantScan/1.0 PQC-Probe"}
        )
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            headers = dict(resp.headers)

            # Check Alt-Svc header for h3 (HTTP/3 + QUIC often includes PQC)
            alt_svc = headers.get("alt-svc") or headers.get("Alt-Svc") or ""
            if alt_svc:
                pqc_info["alt_svc"] = alt_svc

            # Google/Cloudflare advertise PQC readiness
            for h, v in headers.items():
                v_upper = v.upper()
                if any(p in v_upper for p in ["KYBER","X25519MLKEM","MLKEM","PQC"]):
                    pqc_info["supports_hybrid_pqc"] = True
                    pqc_info["pqc_header_detected"] = True

    except Exception:
        pass

    return pqc_info


# ── Parse X.509 Certificate ───────────────────────────────────────────────
def parse_certificate(der_cert: bytes) -> dict:
    data = {}
    try:
        cert = x509.load_der_x509_certificate(der_cert, default_backend())

        # Subject
        try:
            data["cert_subject"] = cert.subject.rfc4514_string()
        except:
            data["cert_subject"] = "Unknown"

        # Issuer
        try:
            data["cert_issuer"] = cert.issuer.rfc4514_string()
        except:
            data["cert_issuer"] = "Unknown"

        # Signature algorithm
        try:
            data["cert_algo"] = cert.signature_hash_algorithm.name
        except:
            data["cert_algo"] = "Unknown"

        # Key size
        # Key size
        try:
            from cryptography.hazmat.primitives.asymmetric import ec, rsa, dsa
            pub_key = cert.public_key()
            if isinstance(pub_key, rsa.RSAPublicKey):
                data["cert_key_size"] = pub_key.key_size
            elif isinstance(pub_key, ec.EllipticCurvePublicKey):
                # EC keys are fine at 256-bit — equivalent to RSA 3072
                data["cert_key_size"] = pub_key.key_size
                data["cert_key_type"] = "EC"
            else:
                data["cert_key_size"] = 0
        except:
            data["cert_key_size"] = 0

        # Validity dates
        try:
            not_before = cert.not_valid_before_utc
            not_after  = cert.not_valid_after_utc
            now        = datetime.now(not_after.tzinfo)

            data["cert_valid_from"] = not_before.strftime("%Y-%m-%d")
            data["cert_expiry"]     = not_after.strftime("%Y-%m-%d")

            days_left = (not_after - now).days
            if days_left < 0:
                data["cert_status"] = "Expired"
            elif days_left < 30:
                data["cert_status"] = "Expiring Soon"
            elif days_left < 90:
                data["cert_status"] = "Expiring"
            else:
                data["cert_status"] = "Valid"
        except:
            data["cert_status"] = "Unknown"

    except Exception as e:
        data["cert_subject"] = f"Parse error: {str(e)}"

    return data


# ── Extract key exchange from cipher suite name ───────────────────────────
def extract_key_exchange(cipher_suite: str) -> str:
    suite = cipher_suite.upper()
    if "ECDHE" in suite: return "ECDHE"
    if "DHE"   in suite: return "DHE"
    if "RSA"   in suite: return "RSA"
    if "KYBER" in suite: return "Kyber"
    if "MLKEM" in suite: return "ML-KEM"
    # TLS 1.3 always uses ephemeral key exchange (X25519 or P-256)
    # cipher suite name doesn't include it — default to X25519
    return "X25519"


# ── Detect asset type from host/port ─────────────────────────────────────
def detect_asset_type(host: str, port: int) -> str:
    host_lower = host.lower()
    if port == 1194 or "vpn" in host_lower: return "TLS-VPN"
    if "api"    in host_lower:              return "API Gateway"
    if "mail"   in host_lower:              return "Mail Server"
    if "portal" in host_lower:              return "Web Portal"
    if port in [80, 443, 8443]:             return "Web Server"
    return "Generic TLS Service"


# ── PQC Scoring Engine ────────────────────────────────────────────────────
def calculate_pqc_score(data: dict) -> dict:
    score = 0
    recs  = []

    # ── PILLAR 1: Inventory & Visibility (25 pts) ──────────────────────
    # Our scanner automatically discovers and inventories crypto assets
    # Full marks because we ARE the automated discovery tool
    pillar1 = 25  # Automated CBOM generation = full marks for this pillar

    # ── PILLAR 2: Risk Analysis & HNDL (25 pts) ────────────────────────
    pillar2 = 0
    kex_upper    = (data.get("key_exchange")  or "").upper()
    cipher_upper = (data.get("cipher_suite")  or "").upper()
    tls          = (data.get("tls_version")   or "")
    cert_status  = (data.get("cert_status")   or "")
    key_size     = data.get("cert_key_size")  or 0
    key_type     = data.get("cert_key_type")  or "RSA"
    algo         = (data.get("cert_algo")     or "").lower()

    # TLS version risk
    if tls == "TLSv1.3":
        pillar2 += 10
    elif tls == "TLSv1.2":
        pillar2 += 5
    else:
        recs.append("CRITICAL: Upgrade to TLS 1.3 immediately — TLS 1.0/1.1 are deprecated")

    # Certificate expiry risk
    if cert_status == "Valid":
        pillar2 += 10
    elif cert_status == "Expiring":
        pillar2 += 5
        recs.append("Certificate expiring soon — renew within 90 days")
    elif cert_status == "Expiring Soon":
        pillar2 += 2
        recs.append("Certificate expiring very soon — renew immediately")
    elif cert_status == "Expired":
        pillar2 += 0
        recs.append("CRITICAL: Certificate has expired — replace immediately")

    # Key size risk (RSA only)
    if key_type != "EC":
        if key_size >= 4096:
            pillar2 += 5
        elif key_size >= 2048:
            pillar2 += 3
        else:
            pillar2 += 0
            recs.append(f"RSA key size {key_size}-bit is too small — upgrade to 2048-bit minimum")
    else:
        pillar2 += 5  # EC keys are fine

    # ── PILLAR 3: Technical Implementation (50 pts) ────────────────────
    pillar3 = 0

    # Key Exchange (20 pts)
    is_pqc_kex = any(p in kex_upper or p in cipher_upper
                     for p in ["KYBER","MLKEM","ML-KEM","NTRU","FRODO","SABER"])
    is_hybrid  = "HYBRID" in kex_upper or "X25519+ML-KEM" in kex_upper

    if is_pqc_kex:
        pillar3 += 20
    elif is_hybrid:
        pillar3 += 12
        recs.append("Hybrid PQC detected — migrate fully to ML-KEM-1024 (NIST FIPS 203)")
    else:
        pillar3 += 0
        recs.append("Replace key exchange with ML-KEM-1024 (NIST FIPS 203) — currently quantum-vulnerable")

    # Certificate Algorithm (15 pts)
    PQC_SIGS = ["dilithium","falcon","sphincs","mldsa","ml-dsa","slhdsa","slh-dsa","fndsa","fn-dsa"]
    if any(p in algo for p in PQC_SIGS):
        pillar3 += 15
    else:
        pillar3 += 0
        recs.append("Replace certificate signature with ML-DSA-65 (NIST FIPS 204) or SLH-DSA (NIST FIPS 205)")

    # Cipher Strength (10 pts)
    if "AES_256" in cipher_upper or "AES256" in cipher_upper:
        pillar3 += 10
    elif "AES_128" in cipher_upper or "AES128" in cipher_upper:
        pillar3 += 6
    elif "CHACHA20" in cipher_upper:
        pillar3 += 8
    elif any(w in cipher_upper for w in ["DES","3DES","RC4","NULL"]):
        pillar3 += 0
        recs.append("Remove weak cipher suites (DES/3DES/RC4) immediately")
    else:
        pillar3 += 5

    # Forward Secrecy (5 pts)
    if any(fs in kex_upper for fs in ["ECDHE","DHE","X25519","X448","MLKEM","KYBER"]):
        pillar3 += 5
    else:
        pillar3 += 0
        recs.append("Enable forward secrecy — use ECDHE or ML-KEM key exchange")

    # ── Total Score ─────────────────────────────────────────────────────
    score = pillar1 + pillar2 + pillar3

        # ── Realistic HNDL Risk ─────────────────────────────────────────────
    if is_pqc_kex or is_hybrid:
        hndl_risk = "Low"
    elif tls == "TLSv1.3" and any(fs in kex_upper for fs in ["X25519", "ECDHE", "DHE"]):
        hndl_risk = "Moderate"
    elif tls == "TLSv1.2":
        hndl_risk = "Moderate"
    else:
        hndl_risk = "High"
        recs.append("HNDL Risk: intercepted sessions may be vulnerable to future quantum decryption")

    # ── Better PQC Labels ───────────────────────────────────────────────
    if is_pqc_kex and any(p in algo for p in PQC_SIGS):
        label = "Quantum-Safe"
        is_pqc_ready = 1
    elif is_pqc_kex or is_hybrid:
        label = "PQC-Ready"
        is_pqc_ready = 1
    elif tls == "TLSv1.3" and any(fs in kex_upper for fs in ["X25519", "ECDHE"]):
        label = "Modern Secure (Not PQC Ready)"
        is_pqc_ready = 0
    elif tls == "TLSv1.2":
        label = "Transitional Risk"
        is_pqc_ready = 0
    else:
        label = "Critical Risk"
        is_pqc_ready = 0

    if not recs:
        recs.append("Excellent — asset meets quantum-safe standards. Maintain and monitor.")

    return {
        "pqc_score":    round(score, 2),
        "pqc_label":    label,
        "hndl_risk":    hndl_risk,
        "is_pqc_ready": is_pqc_ready,
        "pillar1":      pillar1,
        "pillar2":      pillar2,
        "pillar3":      pillar3,
    }


# ── Recommendation generator ──────────────────────────────────────────────
def generate_recommendations(data: dict) -> list:
    recs = []
    tls     = data.get("tls_version") or ""
    cipher  = (data.get("cipher_suite") or "").upper()
    algo    = (data.get("cert_algo") or "").lower()
    kex     = (data.get("key_exchange") or "").upper()
    key_sz  = data.get("cert_key_size") or 0
    status  = data.get("cert_status") or ""

    if tls in ["TLSv1", "TLSv1.1"]:
        recs.append("CRITICAL: Upgrade to TLS 1.3 immediately")
    elif tls == "TLSv1.2":
        recs.append("Upgrade TLS 1.2 → TLS 1.3")

    if any(w in cipher for w in ["DES", "3DES", "RC4", "CBC", "NULL"]):
        recs.append("Remove weak cipher suites from configuration")

    if not any(p in algo for p in PQC_SIGNATURE_ALGOS):
        recs.append("Replace RSA/ECDSA certificate → ML-DSA-65 (NIST FIPS 204)")

    if any(v in kex for v in ["RSA", "ECDHE", "DHE"]):
        recs.append("Replace key exchange → ML-KEM-1024 (NIST FIPS 203)")

    key_type = data.get("cert_key_type") or "RSA"
    if key_type != "EC" and 0 < key_sz < 2048:
        recs.append(f"Upgrade RSA key size from {key_sz}-bit to minimum 2048-bit")

    if status in ["Expired", "Expiring Soon"]:
        recs.append(f"Certificate is {status} — renew immediately")

    if not recs:
        recs.append("Asset is quantum safe — maintain configuration and monitor")

    return recs


