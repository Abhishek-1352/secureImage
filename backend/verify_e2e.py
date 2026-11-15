import requests
import json
import base64
import hashlib
import sys
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000/api"
TEST_IMAGE_PATH = Path(r"D:\Clg\7th sem\CNS\2.jpeg")

def run_e2e_verification():
    print("=" * 70)
    print("SECUREIMAGE -- FULL AUTOMATED END-TO-END VERIFICATION")
    print("=" * 70)

    session = requests.Session()

    # Step 1: Health check
    print("\n[Step 1] Verifying Backend Health...")
    r = session.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print(f"      [OK] Backend Status: {r.json()['status']}, Version: {r.json()['version']}")

    # Step 2: Register User
    print("\n[Step 2] Registering User 'student@secureimage.local'...")
    user_email = "student@secureimage.local"
    user_pass = "CollegeStudent2026!"
    reg_data = {
        "full_name": "Demo Student",
        "email": user_email,
        "password": user_pass,
        "confirm_password": user_pass
    }
    r = session.post(f"{BASE_URL}/auth/register", json=reg_data)
    if r.status_code == 400 and "already exists" in r.text:
        print("      [INFO] User already registered, proceeding to login.")
    else:
        assert r.status_code == 201, f"Registration failed: {r.text}"
        print(f"      [OK] User registered successfully: ID {r.json()['id']}")

    # Step 3: Login User
    print("\n[Step 3] Logging in as User...")
    r = session.post(f"{BASE_URL}/auth/login", json={"email": user_email, "password": user_pass})
    assert r.status_code == 200, f"Login failed: {r.text}"
    user_token = r.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}
    print(f"      [OK] JWT Received: {user_token[:25]}... (Role: {r.json()['user']['role']})")

    # Step 4: Encrypt Real JPEG Image
    print(f"\n[Step 4] Encrypting real image '{TEST_IMAGE_PATH.name}' ({TEST_IMAGE_PATH.stat().st_size} bytes)...")
    original_bytes = TEST_IMAGE_PATH.read_bytes()
    expected_sha256 = hashlib.sha256(original_bytes).hexdigest()
    print(f"      [INFO] Original SHA-256: {expected_sha256}")

    with open(TEST_IMAGE_PATH, "rb") as f:
        files = {"file": (TEST_IMAGE_PATH.name, f, "image/jpeg")}
        r = session.post(f"{BASE_URL}/images/encrypt", files=files, headers=user_headers)
    assert r.status_code == 200, f"Encryption failed: {r.text}"
    enc_data = r.json()
    file_id = enc_data["file_id"]
    print(f"      [OK] Hybrid Encryption Completed!")
    print(f"      [OK] Algorithm: {enc_data['algorithm']}")
    print(f"      [OK] Key Encapsulation: {enc_data['key_protection']}")
    print(f"      [OK] Package Filename: {enc_data['encrypted_filename']}")
    assert enc_data["sha256"].lower() == expected_sha256.lower(), "SHA-256 mismatch in encryption response!"

    # Step 5: Download and Inspect .simg package
    print("\n[Step 5] Downloading .simg package and verifying container structure...")
    r = session.get(f"{BASE_URL}/images/{file_id}/download", headers=user_headers)
    assert r.status_code == 200, f"Download failed: {r.text}"
    package_bytes = r.content
    package_json = json.loads(package_bytes.decode("utf-8"))

    # Verify encrypted package is NOT the original image
    assert package_bytes != original_bytes, "CRITICAL ERROR: Package bytes match original image bytes!"
    assert not package_bytes.startswith(b"\xff\xd8\xff"), "CRITICAL ERROR: Package contains raw JPEG magic bytes!"
    assert "encrypted_aes_key" in package_json, "Missing wrapped AES key in container!"
    assert "ciphertext" in package_json, "Missing ciphertext in container!"
    assert "nonce" in package_json, "Missing GCM nonce in container!"
    print("      [OK] Package is a valid self-contained cryptographic container.")
    print("      [OK] Verified: Container is NOT readable as an image and contains no plaintext JPEG headers.")

    # Step 6: Decrypt .simg package
    print("\n[Step 6] Decrypting .simg package via POST /api/images/decrypt...")
    dec_files = {"file": ("test_package.simg", package_bytes, "application/json")}
    r = session.post(f"{BASE_URL}/images/decrypt", files=dec_files, headers=user_headers)
    assert r.status_code == 200, f"Decryption failed: {r.text}"
    dec_data = r.json()
    assert dec_data["success"] is True
    assert dec_data["integrity"] == "VERIFIED"
    assert dec_data["recovered_sha256"].lower() == expected_sha256.lower()
    print("      [OK] Decryption Successful!")
    print(f"      [OK] Integrity Verdict: {dec_data['integrity']}")
    print(f"      [OK] Original SHA-256:  {dec_data['original_sha256']}")
    print(f"      [OK] Recovered SHA-256: {dec_data['recovered_sha256']}")

    # Verify recovered image bytes
    recovered_bytes = base64.b64decode(dec_data["decrypted_data_base64"])
    assert recovered_bytes == original_bytes, "Recovered image bytes do NOT match original image bytes!"
    print(f"      [OK] Byte-for-byte exact fidelity verified ({len(recovered_bytes)} bytes recovered).")

    # Step 7: Check User History
    print("\n[Step 7] Checking User Operation History...")
    r = session.get(f"{BASE_URL}/images/history", headers=user_headers)
    assert r.status_code == 200
    history = r.json()
    assert len(history) >= 2
    print(f"      [OK] History contains {len(history)} operations for this user.")
    for op in history[:2]:
        print(f"           - {op['operation_type']} {op['original_filename']} -> {op['status']}")

    # Step 8: Tampering Detection Test
    print("\n[Step 8] Testing Tamper Resistance with Corrupted Package...")
    tampered_package = dict(package_json)
    ct_chars = list(tampered_package["ciphertext"])
    ct_chars[20] = "X" if ct_chars[20] != "X" else "Y"
    tampered_package["ciphertext"] = "".join(ct_chars)
    tampered_bytes = json.dumps(tampered_package).encode("utf-8")

    tampered_files = {"file": ("tampered.simg", tampered_bytes, "application/json")}
    r = session.post(f"{BASE_URL}/images/decrypt", files=tampered_files, headers=user_headers)
    assert r.status_code == 400, f"Expected 400 Bad Request, got {r.status_code}"
    error_detail = r.json().get("detail", "")
    print(f"      [OK] Server rejected tampered package with status 400!")
    print(f"      [OK] Error message: '{error_detail}'")
    assert "Decryption failed" in error_detail or "modified" in error_detail

    # Step 9: Login as Admin
    print("\n[Step 9] Logging in as Administrator ('admin@secureimage.local')...")
    r = session.post(f"{BASE_URL}/auth/login", json={"email": "admin@secureimage.local", "password": "Admin@123456"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_token = r.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("      [OK] Admin authenticated successfully.")

    # Step 10: Verify Admin Stats
    print("\n[Step 10] Fetching Admin Dashboard Telemetry...")
    r = session.get(f"{BASE_URL}/admin/stats", headers=admin_headers)
    assert r.status_code == 200
    stats = r.json()
    print(f"      [OK] Total Users:       {stats['total_users']}")
    print(f"      [OK] Total Encryptions: {stats['total_encryptions']}")
    print(f"      [OK] Total Decryptions: {stats['total_decryptions']}")
    print(f"      [OK] Failed Operations: {stats['failed_operations']}")
    assert stats["failed_operations"] >= 1, "Failed operation from step 8 was not tracked in stats!"

    # Step 11: Verify Admin User Management
    print("\n[Step 11] Verifying User Management Table...")
    r = session.get(f"{BASE_URL}/admin/users", headers=admin_headers)
    assert r.status_code == 200
    all_users = r.json()
    student_u = next((u for u in all_users if u["email"] == user_email), None)
    assert student_u is not None, "Registered student user not found in admin user list!"
    print(f"      [OK] Found student account: {student_u['full_name']} (Ops: {student_u['operations_count']})")

    # Step 12: Verify Admin Audit Logs & Forensic Verification
    print("\n[Step 12] Inspecting System Audit Logs...")
    r = session.get(f"{BASE_URL}/admin/logs", headers=admin_headers)
    assert r.status_code == 200
    logs = r.json()
    assert len(logs) > 0
    print(f"      [OK] System Audit Trail has {len(logs)} log entries recorded.")
    recent_failed_logs = [l for l in logs if l["status"] == "FAILED"]
    print(f"      [OK] Verified {len(recent_failed_logs)} failed/tampered events recorded in audit trail.")
    for l in logs[:4]:
        print(f"           [{l['status']}] {l['action']} - {l['details'][:60]}...")

    print("\n" + "=" * 70)
    print(">>> ALL 12 END-TO-END VERIFICATION STEPS PASSED PERFECTLY! <<<")
    print("=" * 70)

if __name__ == "__main__":
    run_e2e_verification()
