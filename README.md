# QuantScan 

QuantScan is a Post-Quantum Cryptography (PQC) readiness scanner designed for public-facing banking systems.

## Features
- Asset Discovery (Web Servers, TLS endpoints)
- TLS & Certificate Inspection
- Cryptographic Bill of Materials (CBOM)
- PQC Readiness Classification
- Cyber Risk Scoring Dashboard

## Problem
Current banking systems use cryptography (RSA/ECC) that may become vulnerable with quantum computing (Harvest Now, Decrypt Later attacks).

## Solution
QuantScan scans public-facing assets and evaluates their **post-quantum readiness**, helping organizations plan secure migration.

## Tech Stack
- Backend: FastAPI (Python)
- Frontend: React.js (Vite)
- Database: SQLite
- Visualization: Recharts

## Demo
Working prototype includes:
- Dashboard
- Asset Inventory
- CBOM Analysis
- Cyber Rating

## Note
This prototype evaluates **externally observable cryptographic posture** and provides PQC readiness insights.

## 🏆 Hackathon
Built for **PNB CyberSecurity Hackathon 2026**
