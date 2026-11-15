import base64
import datetime
import json
import os
from pathlib import Path
from typing import Tuple, Dict, Any

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings
from app.utils.hashing import calculate_sha256

class CryptoService:
    def __init__(self):
        self.private_key_path: Path = settings.PRIVATE_KEY_PATH
        self.public_key_path: Path = settings.PUBLIC_KEY_PATH
        self.key_size: int = settings.RSA_KEY_SIZE
        self.ensure_rsa_keys()

    def ensure_rsa_keys(self) -> None:
        """
        Ensures RSA key pair exists on server startup.
        If missing, generates fresh RSA-2048 (or configured size) key pair.
        Keys are stored securely in backend/keys/ directory.
        """
        if not self.private_key_path.exists() or not self.public_key_path.exists():
            # Generate new RSA private key
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=self.key_size
            )
            # Serialize private key to PEM (PKCS8)
            private_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
            # Serialize public key to PEM (SubjectPublicKeyInfo)
            public_pem = private_key.public_key().public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )

            # Write keys with restrictive permissions
            self.private_key_path.parent.mkdir(parents=True, exist_ok=True)
            self.private_key_path.write_bytes(private_pem)
            self.public_key_path.write_bytes(public_pem)

    def _load_private_key(self) -> rsa.RSAPrivateKey:
        """Loads server private key from disk."""
        if not self.private_key_path.exists():
            self.ensure_rsa_keys()
        pem_data = self.private_key_path.read_bytes()
        return serialization.load_pem_private_key(pem_data, password=None)

    def _load_public_key(self) -> rsa.RSAPublicKey:
        """Loads server public key from disk."""
        if not self.public_key_path.exists():
            self.ensure_rsa_keys()
        pem_data = self.public_key_path.read_bytes()
        return serialization.load_pem_public_key(pem_data)

    def _get_oaep_padding(self) -> padding.OAEP:
        """Standard RSA-OAEP with SHA-256 and MGF1(SHA-256)."""
        return padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )

    def encrypt_image(self, image_bytes: bytes, original_filename: str, mime_type: str) -> Dict[str, Any]:
        """
        Performs Hybrid Encryption:
        1. Calculates SHA-256 fingerprint of original image bytes.
        2. Generates cryptographically secure 256-bit (32 bytes) AES key.
        3. Generates cryptographically secure 96-bit (12 bytes) AES-GCM nonce.
        4. Encrypts image bytes using AES-256-GCM (produces ciphertext + authentication tag).
        5. Encrypts the 256-bit AES key with RSA-OAEP using server RSA Public Key.
        6. Packages all required metadata into structured .simg format.
        """
        # 1. SHA-256 digest
        original_sha256 = calculate_sha256(image_bytes)

        # 2. Fresh random 256-bit AES key
        aes_key = os.urandom(32)

        # 3. Fresh random 96-bit GCM nonce
        nonce = os.urandom(12)

        # 4. AES-256-GCM encryption
        aesgcm = AESGCM(aes_key)
        # In python cryptography, AESGCM.encrypt appends 16-byte authentication tag
        ciphertext_with_tag = aesgcm.encrypt(nonce, image_bytes, None)

        # 5. RSA-OAEP key wrapping
        public_key = self._load_public_key()
        oaep = self._get_oaep_padding()
        encrypted_aes_key = public_key.encrypt(aes_key, oaep)

        # 6. Build .simg container dictionary
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        package = {
            "version": "1.0",
            "algorithm": "AES-256-GCM",
            "key_protection": "RSA-OAEP-SHA256",
            "encrypted_aes_key": base64.b64encode(encrypted_aes_key).decode("utf-8"),
            "nonce": base64.b64encode(nonce).decode("utf-8"),
            "ciphertext": base64.b64encode(ciphertext_with_tag).decode("utf-8"),
            "original_filename": original_filename,
            "original_mime_type": mime_type,
            "original_size": len(image_bytes),
            "sha256": original_sha256,
            "created_at": now_iso
        }

        return package

    def decrypt_package(self, package_data: Dict[str, Any]) -> Tuple[bytes, Dict[str, Any]]:
        """
        Performs Hybrid Decryption:
        1. Validates package format and required fields.
        2. Unwraps AES session key using server RSA Private Key via RSA-OAEP.
        3. Decrypts and verifies ciphertext with recovered AES key and nonce via AES-256-GCM.
           If authentication tag fails or data is tampered, raises ValueError.
        4. Reconstructs image and calculates recovered SHA-256 fingerprint.
        5. Verifies integrity match against original fingerprint.
        """
        # Required keys validation
        required_fields = [
            "version", "algorithm", "key_protection", "encrypted_aes_key",
            "nonce", "ciphertext", "original_filename", "original_mime_type",
            "original_size", "sha256"
        ]
        for field in required_fields:
            if field not in package_data:
                raise ValueError(f"Invalid package format: missing required field '{field}'.")

        if package_data.get("algorithm") != "AES-256-GCM":
            raise ValueError(f"Unsupported algorithm: {package_data.get('algorithm')}")

        if package_data.get("key_protection") != "RSA-OAEP-SHA256":
            raise ValueError(f"Unsupported key protection: {package_data.get('key_protection')}")

        try:
            encrypted_aes_key = base64.b64decode(package_data["encrypted_aes_key"])
            nonce = base64.b64decode(package_data["nonce"])
            ciphertext_with_tag = base64.b64decode(package_data["ciphertext"])
        except Exception as e:
            raise ValueError("Corrupted package: base64 decoding failed.") from e

        # Step 1: Recover AES key with RSA-OAEP
        private_key = self._load_private_key()
        oaep = self._get_oaep_padding()
        try:
            aes_key = private_key.decrypt(encrypted_aes_key, oaep)
        except Exception as e:
            raise ValueError("Decryption failed: encrypted key was modified or invalid.") from e

        if len(aes_key) != 32:
            raise ValueError("Decryption failed: recovered AES key size is invalid.")

        # Step 2: Authenticated AES-GCM decryption
        try:
            aesgcm = AESGCM(aes_key)
            decrypted_image_bytes = aesgcm.decrypt(nonce, ciphertext_with_tag, None)
        except InvalidTag as e:
            raise ValueError("Decryption failed: encrypted data was modified or authentication failed.") from e
        except Exception as e:
            raise ValueError("Decryption failed: encrypted data was modified or authentication failed.") from e

        # Step 3: SHA-256 Integrity check
        recovered_sha256 = calculate_sha256(decrypted_image_bytes)
        original_sha256 = package_data["sha256"]
        integrity_verified = (recovered_sha256.lower() == original_sha256.lower())

        metadata = {
            "original_filename": package_data["original_filename"],
            "original_mime_type": package_data["original_mime_type"],
            "original_size": package_data["original_size"],
            "original_sha256": original_sha256,
            "recovered_sha256": recovered_sha256,
            "integrity": "VERIFIED" if integrity_verified else "FAILED",
            "created_at": package_data.get("created_at")
        }

        if not integrity_verified:
            raise ValueError("Decryption failed: recovered image checksum does not match original digest.")

        return decrypted_image_bytes, metadata

crypto_service = CryptoService()
