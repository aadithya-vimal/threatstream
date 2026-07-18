import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings
from app.core.errors import UpstreamServiceError


class CredentialCipher:
    def __init__(self, encoded_key: str | None = None):
        key_value = encoded_key or settings.CREDENTIAL_ENCRYPTION_KEY
        try:
            key = base64.urlsafe_b64decode(key_value.encode("ascii"))
        except (ValueError, UnicodeEncodeError) as exc:
            raise UpstreamServiceError(
                "Credential encryption is not configured",
                status_code=503,
                code="credential_encryption_unavailable",
            ) from exc
        if len(key) != 32:
            raise UpstreamServiceError(
                "Credential encryption is not configured",
                status_code=503,
                code="credential_encryption_unavailable",
            )
        self.cipher = AESGCM(key)

    def encrypt(self, plaintext: str, workspace_id: str, provider_key: str) -> tuple[str, str]:
        nonce = os.urandom(12)
        associated_data = f"{workspace_id}:{provider_key}".encode("utf-8")
        ciphertext = self.cipher.encrypt(nonce, plaintext.encode("utf-8"), associated_data)
        return (
            base64.urlsafe_b64encode(ciphertext).decode("ascii"),
            base64.urlsafe_b64encode(nonce).decode("ascii"),
        )

    def decrypt(self, ciphertext: str, nonce: str, workspace_id: str, provider_key: str) -> str:
        associated_data = f"{workspace_id}:{provider_key}".encode("utf-8")
        plaintext = self.cipher.decrypt(
            base64.urlsafe_b64decode(nonce.encode("ascii")),
            base64.urlsafe_b64decode(ciphertext.encode("ascii")),
            associated_data,
        )
        return plaintext.decode("utf-8")


def secret_hint(secret: str) -> str:
    suffix = secret[-4:] if len(secret) >= 4 else "set"
    return f"••••{suffix}"
