import socket

import ssl
import socket
import json
from datetime import datetime

def scan_host(host: str):
    # ✅ Resolve IP
    try:
        ip = socket.gethostbyname(host)
    except:
        return {"error": f"Cannot resolve host: {host}"}

    # ✅ TLS scan
    tls_version = "N/A"
    cipher_suite = "N/A"
    key_exchange = "N/A"
    cert_expiry = "N/A"
    cert_algo = "N/A"
    cert_key_size = 0
    cert_subject = "N/A"
    cert_issuer = "N/A"
    cert_status = "Unknown"
    cert_valid_from = "N/A"

    try:
        context = ssl.create_default_context()
        with socket.create_connection((host, 443), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=host) as ssock:
                tls_version = ssock.version()
                cipher = ssock.cipher()
                cipher_suite = cipher[0] if cipher else "N/A"
                cert = ssock.getpeercert()

                expire_str = cert.get("notAfter", "")
                valid_from_str = cert.get("notBefore", "")

                if expire_str:
                    expiry_date = datetime.strptime(expire_str, "%b %d %H:%M:%S %Y %Z")
                    cert_expiry = expiry_date.strftime("%Y-%m-%d")
                    days_left = (expiry_date - datetime.utcnow()).days
                    if days_left < 0:
                        cert_status = "Expired"
                    elif days_left < 30:
                        cert_status = "Expiring Soon"
                    elif days_left < 90:
                        cert_status = "Expiring"
                    else:
                        cert_status = "Valid"

                if valid_from_str:
                    cert_valid_from = datetime.strptime(
                        valid_from_str, "%b %d %H:%M:%S %Y %Z"
                    ).strftime("%Y-%m-%d")

                subject = dict(x[0] for x in cert.get("subject", []))
                issuer  = dict(x[0] for x in cert.get("issuer", []))
                cert_subject = subject.get("commonName", "N/A")
                cert_issuer  = issuer.get("organizationName", "N/A")

                if "ECDSA" in cipher_suite:
                    cert_algo = "ECDSA"
                elif "RSA" in cipher_suite:
                    cert_algo = "RSA"

                if "ECDHE" in cipher_suite:
                    key_exchange = "ECDHE"
                elif "DHE" in cipher_suite:
                    key_exchange = "DHE"
                else:
                    key_exchange = cipher_suite.split("_")[0]

    except Exception as e:
        cert_status = "TLS Error"

    # ✅ PQC scoring
    pqc_score = 0
    recommendations = []

    if tls_version == "TLSv1.3":
        pqc_score += 40
    elif tls_version == "TLSv1.2":
        pqc_score += 20
        recommendations.append("Upgrade to TLS 1.3")
    else:
        recommendations.append("Critical: Upgrade TLS version immediately")

    if key_exchange in ["ECDHE", "DHE"]:
        pqc_score += 30
    else:
        recommendations.append("Use ECDHE or DHE key exchange")

    if cert_status == "Valid":
        pqc_score += 20
    else:
        recommendations.append(f"Certificate issue: {cert_status}")

    if cert_algo == "ECDSA":
        pqc_score += 10
        recommendations.append("Consider post-quantum algorithms")
    elif cert_algo == "RSA":
        pqc_score += 5
        recommendations.append("Consider post-quantum algorithms")

    # ✅ PQC Label
    if pqc_score >= 80:
        pqc_label = "Quantum-Safe"
        is_pqc_ready = True
        hndl_risk = "Low"
    elif pqc_score >= 60:
        pqc_label = "PQC-Ready"
        is_pqc_ready = True
        hndl_risk = "Low"
    elif pqc_score >= 40:
        pqc_label = "Modern Secure (Not PQC Ready)"
        is_pqc_ready = False
        hndl_risk = "Medium"
    elif pqc_score >= 20:
        pqc_label = "Transitional Risk"
        is_pqc_ready = False
        hndl_risk = "High"
    else:
        pqc_label = "Critical Risk"
        is_pqc_ready = False
        hndl_risk = "High"

    return {
        "host":           host,
        "ip_address":     ip,
        "port":           443,
        "asset_type":     "Subdomain" if host.count(".") > 1 else "Domain",
        "tls_version":    tls_version,
        "cipher_suite":   cipher_suite,
        "key_exchange":   key_exchange,
        "cert_subject":   cert_subject,
        "cert_issuer":    cert_issuer,
        "cert_algo":      cert_algo,
        "cert_key_size":  cert_key_size,
        "cert_expiry":    cert_expiry,
        "cert_valid_from": cert_valid_from,
        "cert_status":    cert_status,
        "pqc_score":      pqc_score,
        "pqc_label":      pqc_label,
        "hndl_risk":      hndl_risk,
        "is_pqc_ready":   is_pqc_ready,
        "recommendations": json.dumps(recommendations),
        "scan_timestamp": datetime.utcnow().isoformat(),
        "pillar1":        tls_version,
        "pillar2":        cipher_suite,
        "pillar3":        cert_status,
    }


import socket

def find_subdomains(domain):
    subdomains = [
        "www", "mail", "ftp", "webmail", "api",
        "dev", "test", "admin", "blog", "shop",
        "m", "app", "cdn", "static", "media",
        "portal", "staging", "beta", "help",
        "support", "docs", "status", "login",
        "vpn", "remote", "smtp", "news", "store"
    ]
    found = []

    for sub in subdomains:
        subdomain = f"{sub}.{domain}"
        try:
            socket.gethostbyname(subdomain)
            found.append(subdomain)
        except:
            pass

    return found



def scan_with_subdomains(host):
    # Extract root domain (mail.google.com → google.com)
    parts = host.strip().split(".")
    if len(parts) > 2:
        host = ".".join(parts[-2:])

    result = {
        "host": host,
        "subdomains": [],
        "subdomain_ports": {}
    }

    # Step 1: get subdomains
    subs = find_subdomains(host)
    result["subdomains"] = subs

    # Step 2: use existing scan_host (DO NOT TOUCH OLD CODE)
    for sub in subs:
        try:
            result["subdomain_ports"][sub] = scan_host(sub)
        except:
            result["subdomain_ports"][sub] = []

    return result