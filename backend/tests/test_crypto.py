import pytest
from app.services.crypto_service import CryptoService
from app.utils.hashing import calculate_sha256

def test_rsa_key_generation(tmp_path):
    priv_path = tmp_path / "private_key.pem"
    pub_path = tmp_path / "public_key.pem"
    
    svc = CryptoService()
    svc.private_key_path = priv_path
    svc.public_key_path = pub_path
    svc.ensure_rsa_keys()
    
    assert priv_path.exists()
    assert pub_path.exists()
    assert b"BEGIN PRIVATE KEY" in priv_path.read_bytes()
    assert b"BEGIN PUBLIC KEY" in pub_path.read_bytes()

def test_image_encryption_and_decryption():
    svc = CryptoService()
    original_data = b"This is a fake image binary data for testing hybrid encryption!" * 20
    filename = "test_image.png"
    mime_type = "image/png"
    
    # 1. Encrypt
    package = svc.encrypt_image(original_data, filename, mime_type)
    
    assert package["version"] == "1.0"
    assert package["algorithm"] == "AES-256-GCM"
    assert package["key_protection"] == "RSA-OAEP-SHA256"
    assert "encrypted_aes_key" in package
    assert "nonce" in package
    assert "ciphertext" in package
    assert package["original_filename"] == filename
    assert package["sha256"] == calculate_sha256(original_data)
    
    # 2. Decrypt
    decrypted_bytes, metadata = svc.decrypt_package(package)
    
    assert decrypted_bytes == original_data
    assert metadata["integrity"] == "VERIFIED"
    assert metadata["original_sha256"] == metadata["recovered_sha256"]

def test_tampered_ciphertext_detection():
    svc = CryptoService()
    original_data = b"Sensitive visual payload" * 50
    package = svc.encrypt_image(original_data, "photo.jpg", "image/jpeg")
    
    # Tamper with the ciphertext (modify a character in the middle of base64)
    tampered_package = dict(package)
    ct = list(tampered_package["ciphertext"])
    ct[15] = "A" if ct[15] != "A" else "B"
    tampered_package["ciphertext"] = "".join(ct)
    
    with pytest.raises(ValueError, match="Decryption failed"):
        svc.decrypt_package(tampered_package)

def test_tampered_nonce_detection():
    svc = CryptoService()
    original_data = b"Sensitive visual payload" * 50
    package = svc.encrypt_image(original_data, "photo.jpg", "image/jpeg")
    
    # Tamper with the nonce
    tampered_package = dict(package)
    nonce_chars = list(tampered_package["nonce"])
    nonce_chars[2] = "X" if nonce_chars[2] != "X" else "Y"
    tampered_package["nonce"] = "".join(nonce_chars)
    
    with pytest.raises(ValueError, match="Decryption failed"):
        svc.decrypt_package(tampered_package)

def test_tampered_encrypted_key_detection():
    svc = CryptoService()
    original_data = b"Confidential medical scan" * 10
    package = svc.encrypt_image(original_data, "scan.png", "image/png")
    
    tampered_package = dict(package)
    key = tampered_package["encrypted_aes_key"]
    modified_char = "Z" if key[10] != "Z" else "Y"
    tampered_package["encrypted_aes_key"] = key[:10] + modified_char + key[11:]
    
    with pytest.raises(ValueError, match="Decryption failed"):
        svc.decrypt_package(tampered_package)
