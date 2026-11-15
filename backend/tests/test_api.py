import io
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.config import settings
from app.database import Base, get_db
from app.models import User, Operation, AuditLog
from app.utils.hashing import hash_password

# Use in-memory SQLite database with StaticPool for test suite
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    # Seed default admin in test DB
    db = TestingSessionLocal()
    admin = User(
        full_name="Admin Test",
        email="admin@test.local",
        password_hash=hash_password("AdminPass123!"),
        role="ADMIN",
        is_active=True
    )
    db.add(admin)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def client():
    return TestClient(app)

def get_auth_token(client, email, password):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]

# Valid test PNG image bytes (1x1 transparent PNG)
VALID_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00"
    b"\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
)

def test_user_registration_and_login(client):
    # 1. Register
    reg_payload = {
        "full_name": "Alice Tester",
        "email": "alice@test.local",
        "password": "Password123!",
        "confirm_password": "Password123!"
    }
    resp = client.post("/api/auth/register", json=reg_payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "alice@test.local"
    assert data["role"] == "USER"
    assert data["is_active"] is True

    # 2. Duplicate registration rejected
    dup_resp = client.post("/api/auth/register", json=reg_payload)
    assert dup_resp.status_code == 400

    # 3. Login
    login_resp = client.post("/api/auth/login", json={"email": "alice@test.local", "password": "Password123!"})
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # 4. Auth /me
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "alice@test.local"

def test_image_encryption_and_decryption_flow(client):
    # Register & Login User
    client.post("/api/auth/register", json={
        "full_name": "Bob Crypto",
        "email": "bob@test.local",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token = get_auth_token(client, "bob@test.local", "Password123!")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Encrypt Image
    files = {"file": ("sample.png", io.BytesIO(VALID_PNG), "image/png")}
    enc_resp = client.post("/api/images/encrypt", files=files, headers=headers)
    assert enc_resp.status_code == 200, enc_resp.text
    enc_data = enc_resp.json()
    assert enc_data["success"] is True
    assert enc_data["algorithm"] == "AES-256-GCM"
    assert enc_data["key_protection"] == "RSA-OAEP-SHA256"
    assert "sha256" in enc_data
    file_id = enc_data["file_id"]

    # 2. Download .simg package
    dl_resp = client.get(f"/api/images/{file_id}/download", headers=headers)
    assert dl_resp.status_code == 200
    package_content = dl_resp.content
    package_json = json.loads(package_content.decode("utf-8"))
    assert "encrypted_aes_key" in package_json
    assert "ciphertext" in package_json
    assert "nonce" in package_json

    # 3. Decrypt .simg package
    dec_files = {"file": ("sample.simg", io.BytesIO(package_content), "application/json")}
    dec_resp = client.post("/api/images/decrypt", files=dec_files, headers=headers)
    assert dec_resp.status_code == 200, dec_resp.text
    dec_data = dec_resp.json()
    assert dec_data["success"] is True
    assert dec_data["integrity"] == "VERIFIED"
    assert dec_data["original_sha256"] == dec_data["recovered_sha256"]
    assert dec_data["original_filename"] == "sample.png"

    # 4. Check User History
    hist_resp = client.get("/api/images/history", headers=headers)
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert len(history) >= 2  # 1 encrypt, 1 decrypt
    types = [h["operation_type"] for h in history]
    assert "ENCRYPT" in types
    assert "DECRYPT" in types

def test_tampered_package_decryption_failure(client):
    token = get_auth_token(client, "admin@test.local", "AdminPass123!")
    headers = {"Authorization": f"Bearer {token}"}

    # Encrypt
    files = {"file": ("test.png", io.BytesIO(VALID_PNG), "image/png")}
    enc_resp = client.post("/api/images/encrypt", files=files, headers=headers)
    file_id = enc_resp.json()["file_id"]

    # Download package
    dl_resp = client.get(f"/api/images/{file_id}/download", headers=headers)
    package_json = json.loads(dl_resp.content.decode("utf-8"))

    # Tamper with ciphertext
    ct_list = list(package_json["ciphertext"])
    ct_list[12] = "A" if ct_list[12] != "A" else "B"
    package_json["ciphertext"] = "".join(ct_list)
    tampered_bytes = json.dumps(package_json).encode("utf-8")

    # Attempt decrypt
    dec_files = {"file": ("tampered.simg", io.BytesIO(tampered_bytes), "application/json")}
    dec_resp = client.post("/api/images/decrypt", files=dec_files, headers=headers)
    assert dec_resp.status_code == 400
    assert "Decryption failed" in dec_resp.json()["detail"]

    # Verify failed operation appears in history
    hist_resp = client.get("/api/images/history", headers=headers)
    failed_ops = [h for h in hist_resp.json() if h["status"] == "FAILED"]
    assert len(failed_ops) > 0

def test_invalid_file_rejected(client):
    token = get_auth_token(client, "admin@test.local", "AdminPass123!")
    headers = {"Authorization": f"Bearer {token}"}

    # Upload plain text disguised as image
    fake_file = b"echo 'Hello dangerous executable script';"
    files = {"file": ("script.jpg", io.BytesIO(fake_file), "image/jpeg")}
    resp = client.post("/api/images/encrypt", files=files, headers=headers)
    assert resp.status_code == 400
    assert "File content does not match" in resp.json()["detail"]

def test_rbac_and_admin_endpoints(client):
    # Regular user
    client.post("/api/auth/register", json={
        "full_name": "Normal User",
        "email": "normal@test.local",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    user_token = get_auth_token(client, "normal@test.local", "Password123!")
    admin_token = get_auth_token(client, "admin@test.local", "AdminPass123!")

    # 1. Normal user forbidden from admin stats
    resp = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 403

    # 2. Admin can access stats
    admin_stats_resp = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_stats_resp.status_code == 200
    stats = admin_stats_resp.json()
    assert "total_users" in stats
    assert stats["total_users"] >= 2

    # 3. Admin can list users
    users_resp = client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert users_resp.status_code == 200
    user_items = users_resp.json()
    normal_u = next(u for u in user_items if u["email"] == "normal@test.local")

    # 4. Admin deactivates normal user
    deact_resp = client.patch(
        f"/api/admin/users/{normal_u['id']}/status",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert deact_resp.status_code == 200
    assert deact_resp.json()["is_active"] is False

    # 5. Deactivated user blocked from logging in or using endpoints
    blocked_login = client.post("/api/auth/login", json={"email": "normal@test.local", "password": "Password123!"})
    assert blocked_login.status_code == 403
    assert "deactivated" in blocked_login.json()["detail"]

    # 6. Admin cannot deactivate self
    admin_u = next(u for u in user_items if u["email"] == "admin@test.local")
    self_deact = client.patch(
        f"/api/admin/users/{admin_u['id']}/status",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert self_deact.status_code == 400
    assert "cannot deactivate your own" in self_deact.json()["detail"]

    # 7. Admin can view audit logs
    logs_resp = client.get("/api/admin/logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert logs_resp.status_code == 200
    logs = logs_resp.json()
    assert len(logs) > 0
