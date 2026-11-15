# SecureImage — Hybrid Cryptographic System for Secure Image Encryption & Decryption

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg?logo=react)](https://react.dev)
[![Cryptography](https://img.shields.io/badge/Cryptography-pyca%2Fcryptography-critical.svg)](https://cryptography.io)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com)

**SecureImage** is an enterprise-grade, full-stack hybrid cryptographic web application designed for Computer & Network Security / Applied Cryptography college coursework and capstone evaluations. It delivers genuine, authenticated encryption for image assets by uniting the high throughput of **AES-256-GCM** with the key-encapsulation armor of **RSA-OAEP**, verified by real-time **SHA-256** checksum fingerprinting.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Key Capabilities](#key-capabilities)
3. [Cryptographic Architecture](#cryptographic-architecture)
4. [Container Specification (.simg)](#container-specification-simg)
5. [Project Structure](#project-structure)
6. [Prerequisites & Requirements](#prerequisites--requirements)
7. [Installation & Setup](#installation--setup)
8. [Running the Application](#running-the-application)
9. [Pre-configured Demo Credentials](#pre-configured-demo-credentials)
10. [REST API Documentation](#rest-api-documentation)
11. [Automated Testing & E2E Validation](#automated-testing--e2e-validation)
12. [5-Minute College Demonstration Script](#5-minute-college-demonstration-script)
13. [Viva Voce Defense & Theory Cheat Sheet](#viva-voce-defense--theory-cheat-sheet)

---

## 1. Project Overview

Digital images represent large, dense binary matrices. Encrypting large images directly with asymmetric algorithms like RSA is mathematically unfeasible and computationally prohibitive due to block size limits (~190 bytes for RSA-2048 with OAEP). Conversely, relying solely on symmetric ciphers introduces the classic **key-distribution vulnerability**.

**SecureImage solves this fundamental dilemma via Hybrid Cryptography:**
* **Payload Encryption:** Symmetric **AES-256-GCM** encrypts the binary pixel stream at hardware speed, producing ciphertext bound to a 16-byte cryptographic authentication tag.
* **Key Armoring:** The ephemeral 256-bit AES session key is encapsulated using asymmetric **RSA-OAEP** with SHA-256 and MGF1 masking.
* **Integrity Auditing:** Continuous **SHA-256** hashing fingerprints both original and reconstructed binaries, detecting any modification or bit-flipping attack.
* **Role-Based Separation (RBAC):** Normal users perform secure encryption/decryption workflows; administrators monitor telemetry, operation ratios, and tamper forensics without having access to user plaintext images or server private keys.

---

## 2. Key Capabilities

* **High-Security Authenticated Encryption:** AES-256 in Galois/Counter Mode (GCM) with unique 96-bit nonces generated via CSPRNG (`os.urandom`) for every encryption operation.
* **Asymmetric Key Encapsulation:** RSA-2048/3072 with Optimal Asymmetric Encryption Padding (OAEP) using SHA-256 and Mask Generation Function 1 (MGF1).
* **Zero Raw Key Persistence:** AES session keys reside exclusively in volatile memory during active encryption/decryption cycles and are never stored in databases or sent across unencrypted responses.
* **Tamper-Proof Forensic Logs:** Real-time logging of registration, login, successful encryption, authenticated decryption, and tampered payload rejection.
* **Self-Contained Container (`.simg`):** Encrypted packages encapsulate versioning, algorithm tags, base64-armored ciphertext, authentication tag, wrapped AES session key, nonce, and original metadata.
* **Cybersecurity Dashboard:** Dark navy/neon glassmorphism UI built with React, Vite, Tailwind CSS, Lucide icons, and interactive Recharts telemetry charts.

---

## 3. Cryptographic Architecture

### Hybrid Encryption Pipeline

```text
[ USER IMAGE FILE (JPG / PNG / WEBP / BMP) ]
                   │
                   ▼
       Calculate SHA-256 Fingerprint
                   │
                   ▼
   Generate Cryptographically Secure 256-bit AES Key (K_s)
   Generate Cryptographically Secure 96-bit Nonce (N)
                   │
      ┌────────────┴────────────┐
      ▼                         ▼
[ AES-256-GCM ]          [ RSA-OAEP Padding ]
(Image Bytes, K_s, N)     (K_s wrapped using RSA Public Key)
      │                         │
      ▼                         ▼
Ciphertext + Auth Tag     Encrypted Session Key (E_K)
      │                         │
      └────────────┬────────────┘
                   ▼
       [ Secure .simg Container Package ]
```

### Hybrid Decryption & Integrity Pipeline

```text
       [ Secure .simg Container Package ]
                   │
      ┌────────────┴────────────┐
      ▼                         ▼
Encrypted Session Key (E_K)   Ciphertext + Tag + Nonce
      │                         │
      ▼                         │
[ RSA-OAEP Decrypt ]            │
(Using Server Private Key)       │
      │                         │
      ▼                         ▼
Recovered AES Key (K_s) ───► [ AES-256-GCM Decrypt ]
                                │
                      (Tag Verification)
                     [ PASS ]       [ FAIL ]
                        │              │
                        ▼              ▼
                 Recovered Bytes    REJECT with 400 Bad Request
                        │           "Decryption failed: encrypted data
                        ▼           was modified or authentication failed."
              Calculate SHA-256
                        │
                        ▼
      Compare with Original SHA-256
        VERIFIED: Reconstructed Image
```

---

## 4. Container Specification (`.simg`)

When an image is encrypted, the backend packages the cryptographic components into a portable, structured `.simg` JSON container:

```json
{
  "version": "1.0",
  "algorithm": "AES-256-GCM",
  "key_protection": "RSA-OAEP-SHA256",
  "encrypted_aes_key": "xG8qF9...base64-encoded-RSA-wrapped-key...",
  "nonce": "kLm9P2...base64-encoded-12-byte-nonce...",
  "ciphertext": "z81A...base64-encoded-ciphertext-and-tag...",
  "original_filename": "medical_scan.png",
  "original_mime_type": "image/png",
  "original_size": 131573,
  "sha256": "b48652b331b67362bb15ec10b4bb3ce1da613d1a4d3eeb348039afcdfb5db855",
  "created_at": "2026-11-15T15:10:00+00:00"
}
```

---

## 5. Project Structure

```text
SecureImage/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application, CORS, lifespan, exception handlers
│   │   ├── config.py               # Pydantic Settings, environment variables, directories
│   │   ├── database.py             # SQLAlchemy engine & SQLite session provider
│   │   ├── models.py               # Database schemas: User, Operation, EncryptedFile, AuditLog
│   │   ├── schemas.py              # Pydantic request/response validation schemas
│   │   ├── routes/
│   │   │   ├── auth.py             # User registration, login, profile (/api/auth)
│   │   │   ├── images.py           # Encryption, decryption, download, history (/api/images)
│   │   │   └── admin.py            # Analytics, RBAC user toggles, audit logs (/api/admin)
│   │   ├── services/
│   │   │   ├── crypto_service.py   # Core AES-256-GCM, RSA-OAEP, SHA-256 logic
│   │   │   ├── auth_service.py     # JWT token generator, get_current_user, RBAC guard
│   │   │   └── audit_service.py    # Audit trail logger and operation tracker
│   │   └── utils/
│   │       ├── hashing.py          # Bcrypt password hashing and SHA-256 digests
│   │       └── file_validation.py  # Image magic bytes, extension, size validation
│   ├── keys/                       # Auto-generated RSA PEM keys (private_key.pem, public_key.pem)
│   ├── storage/encrypted/          # Persisted .simg package storage
│   ├── tests/
│   │   ├── test_crypto.py          # Unit tests: Keygen, AES-GCM, RSA-OAEP, tampering
│   │   └── test_api.py             # Integration tests: Auth, RBAC, file upload, tamper rejection
│   ├── requirements.txt            # Python dependencies
│   ├── seed_admin.py               # Standalone database and admin initialization script
│   ├── verify_e2e.py               # 12-step end-to-end live server validation script
│   ├── .env.example                # Template backend configuration
│   └── Dockerfile                  # Container definition for backend
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Top navigation, role pill, user identity, logout
│   │   │   └── ProtectedRoute.jsx  # Route authorization guard (user and admin)
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # User authentication state and session persistence
│   │   ├── pages/
│   │   │   ├── Landing.jsx         # Hero, cryptographic architecture visual, viva FAQ
│   │   │   ├── Login.jsx           # Sign-in form with 1-click Demo Fill shortcuts
│   │   │   ├── Register.jsx        # Account registration with live password validation
│   │   │   ├── Dashboard.jsx       # Image Encrypt & Decrypt workspace + previews
│   │   │   ├── History.jsx         # Personal cryptographic audit history table
│   │   │   └── AdminDashboard.jsx  # Admin stats, Recharts diagrams, RBAC user list, logs
│   │   ├── services/
│   │   │   └── api.js              # Axios client with automated Bearer JWT injection
│   │   ├── App.jsx                 # Client-side router configuration
│   │   ├── main.jsx                # React root mount
│   │   └── index.css               # Tailwind directives and cybersecurity theme
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   ├── .env.example
│   └── Dockerfile
│
├── docker-compose.yml              # Multi-container orchestration (Backend + Frontend)
├── start.bat                       # One-click Windows startup script
├── start.ps1                       # PowerShell startup script
├── .gitignore                      # Git exclusion rules for keys, DB, and secrets
└── README.md                       # Comprehensive project documentation
```

---

## 6. Prerequisites & Requirements

* **Python:** 3.11 or 3.12 (Installed and available on PATH)
* **Node.js:** v18, v20, or v22 (with npm)
* **Operating System:** Windows 10/11, Linux, or macOS

---

## 7. Installation & Setup

### Option A: Automatic Startup (Windows)
Simply run either script from the root `SecureImage` directory:
```powershell
.\start.ps1
```
or double-click:
```cmd
start.bat
```

---

### Option B: Step-by-Step Manual Setup

#### 1. Backend Setup
Open a terminal in `SecureImage/backend`:
```powershell
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
# .\venv\Scripts\activate.bat
# Linux/macOS:
# source venv/bin/activate

# Install required dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Initialize database schema and generate initial RSA keys & Admin
python seed_admin.py
```

#### 2. Frontend Setup
Open a second terminal in `SecureImage/frontend`:
```powershell
cd frontend

# Install npm packages
npm install

# Copy environment template
cp .env.example .env
```

---

## 8. Running the Application

### 1. Launch Backend Server
In the backend terminal with active virtual environment:
```powershell
cd backend
.\venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
* **API Server:** http://127.0.0.1:8000
* **Interactive Swagger UI:** http://127.0.0.1:8000/docs
* **Health Check:** http://127.0.0.1:8000/api/health

### 2. Launch Frontend Dev Server
In the frontend terminal:
```powershell
cd frontend
npm run dev
```
* **Web UI:** http://localhost:5173

---

## 9. Pre-configured Demo Credentials

| Role | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@secureimage.local` | `Admin@123456` | Full telemetry, user activation toggling, complete audit log inspection |
| **Student (Demo User)** | `student@secureimage.local` | `CollegeStudent2026!` | Image upload, AES/RSA encryption, decryption, personal operation history |

> **Evaluator Convenience:** The Sign-In page (`/login`) includes a 1-click **"Fill Administrator Credentials"** shortcut button.

---

## 10. REST API Documentation

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Service health & cryptographic algorithms status |
| `POST` | `/api/auth/register` | Public | Register a new user account |
| `POST` | `/api/auth/login` | Public | Authenticate user; returns JWT Bearer token |
| `GET` | `/api/auth/me` | User | Get authenticated user profile & role |
| `POST` | `/api/images/encrypt` | User | Upload image; performs hybrid encryption; returns metadata & download link |
| `GET` | `/api/images/{id}/download`| User/Admin | Download generated `.simg` package file |
| `POST` | `/api/images/decrypt` | User | Upload `.simg` package; unwrap key; decrypt; verify SHA-256 |
| `GET` | `/api/images/history` | User | Get current user's personal operation log |
| `GET` | `/api/admin/stats` | Admin | High-level metrics, 7-day volume chart, and operation ratios |
| `GET` | `/api/admin/users` | Admin | List all registered users with operation counts |
| `PATCH`| `/api/admin/users/{id}/status`| Admin | Activate or deactivate user access |
| `GET` | `/api/admin/logs` | Admin | Retrieve system audit logs with action/status filters |

---

## 11. Automated Testing & E2E Validation

### Unit & Integration Test Suite (Pytest)
Run the automated pytest suite inside `backend/`:
```powershell
cd backend
.\venv\Scripts\python -m pytest tests/ -v
```
**Test Coverage:**
* RSA-2048 keypair generation and file persistence
* AES-256-GCM authenticated encryption and decryption
* Tampered ciphertext bit-flipping rejection via `InvalidTag`
* Tampered nonce detection
* Tampered RSA wrapped key rejection via OAEP failure
* User registration, duplicate email rejection, and bcrypt validation
* JWT authentication and token expiration
* Non-image / fake extension rejection via magic byte analysis
* Role-Based Access Control (non-admin blocked from admin routes)
* Inactive user account access denial
* Admin self-deactivation prevention

### Live Server End-to-End Test (`verify_e2e.py`)
Run the comprehensive 12-step test against the live running server:
```powershell
cd backend
.\venv\Scripts\python verify_e2e.py
```
**Results of 12-step verification:**
1. Health check confirmed (`status: ok`)
2. Student account registered
3. Student logged in and JWT acquired
4. Real JPEG image (`2.jpeg`, 131,573 bytes) encrypted with AES-256-GCM + RSA-OAEP
5. `.simg` package downloaded; verified to be unreadable binary and containing no raw JPEG headers
6. Decrypted package verified; recovered SHA-256 matches original SHA-256 byte-for-byte
7. User operation history validated
8. Deliberately corrupted package rejected with `400 Bad Request` ("Decryption failed")
9. Admin logged in
10. Admin statistics verified (1 encrypt, 1 decrypt, 1 failed op)
11. User management verified
12. Forensic audit logs inspected (6 real events tracked)

---

## 12. 5-Minute College Demonstration Script

Follow this sequence for the viva evaluation:

1. **Architecture Walkthrough (1 minute):**
   * Open `http://localhost:5173`. Show the landing page hero and the interactive **Hybrid Cryptographic Pipeline Architecture** diagram.
   * Explain why hybrid cryptography is necessary: images are too large for RSA, but pure AES requires key exchange; combining AES-256-GCM with RSA-OAEP delivers both performance and security.
2. **User Authentication (30 seconds):**
   * Click **Get Started** or **Sign In**.
   * Register a new student account or log in with `student@secureimage.local` / `CollegeStudent2026!`.
3. **Image Encryption (1 minute):**
   * On the User Dashboard, drag and drop an image (`JPG` or `PNG`).
   * Click **ENCRYPT IMAGE**.
   * Observe the generated metadata: **AES-256-GCM**, **RSA-OAEP-SHA256**, and the **SHA-256 Fingerprint**.
   * Click **Download .simg Package**.
   * Open the `.simg` file in Notepad/VSCode to show the evaluator that it is a secure JSON container with Base64 ciphertext and wrapped keys, not an image.
4. **Decryption & SHA-256 Verification (1 minute):**
   * In the **Decrypt Image** card on the dashboard, upload the `.simg` package.
   * Click **DECRYPT IMAGE**.
   * Show the evaluator:
     * **Integrity: VERIFIED**
     * **Original SHA-256 vs Recovered SHA-256** checksum match.
     * The visual preview of the recovered image.
   * Click **Download Original Image** to prove full fidelity.
5. **Tamper Resistance Demonstration (30 seconds):**
   * Open the `.simg` file in Notepad, alter 1 character in the `ciphertext` string, and save it as `tampered.simg`.
   * Upload `tampered.simg` into the Decrypt card and click **DECRYPT IMAGE**.
   * Observe the red security alert: *"Decryption failed: encrypted data was modified or authentication failed."*
   * Explain that AES-GCM's authentication tag mathematically caught the single bit modification.
6. **Administrator Governance & Audit Trail (1 minute):**
   * Log out and log in as Administrator (`admin@secureimage.local` / `Admin@123456`).
   * Show the **Admin Dashboard**:
     * Live metrics: Total Users, Active Users, Encryptions, Decryptions, and **Failed Operations**.
     * Telemetry charts showing operations distribution.
     * User Management tab: Demonstrate deactivating and reactivating a user.
     * Audit Logs tab: Filter by **FAILED** to show the tamper attempt recorded with timestamp and IP.

---

## 13. Viva Voce Defense & Theory Cheat Sheet

* **Why AES?**
  Symmetric cryptography is orders of magnitude faster than asymmetric cryptography, making it ideal for large binary payloads such as high-resolution images.
* **Why AES-256-GCM instead of AES-CBC or AES-ECB?**
  AES-ECB preserves plaintext data patterns (the famous "ECB Penguin" issue). AES-CBC is malleable and susceptible to padding oracle attacks. AES-GCM provides **Authenticated Encryption with Associated Data (AEAD)**, ensuring both confidentiality and cryptographic integrity simultaneously through an authentication tag.
* **Why RSA?**
  Asymmetric public-key cryptography enables secure session key distribution without requiring pre-shared secret keys between endpoints.
* **Why Hybrid Cryptography?**
  RSA key sizes (e.g., 2048-bit modulus) can only encrypt payloads smaller than the key size minus padding overhead (~190 bytes with OAEP). Hybrid cryptography uses AES for the large file and RSA only to armor the 32-byte AES key.
* **Why RSA-OAEP?**
  Optimal Asymmetric Encryption Padding (OAEP) introduces randomized masking (MGF1) and SHA-256 hashing into the RSA encryption process, preventing chosen-ciphertext attacks (such as Bleichenbacher's attack) that affect PKCS#1 v1.5 padding.
* **Why SHA-256?**
  SHA-256 provides a 256-bit fixed-length cryptographic digest of the original image bytes before encryption and after decryption, delivering verifiable proof of zero byte-level corruption.
* **Why generate a fresh AES key for every operation?**
  Session key reuse exposes multiple ciphertexts to analysis under the same key. A fresh 256-bit key ensures perfect forward secrecy for individual assets.
* **Why a unique GCM nonce?**
  Reusing a nonce with the same key in AES-GCM destroys the authenticity guarantee and allows adversaries to recover the authentication key or forge messages.
* **Why does the Admin not have access to user images or the private key?**
  Principle of Least Privilege and Zero Knowledge: administrative functions only require monitoring system health, usage statistics, and compliance logs, not access to confidential user plaintext.
