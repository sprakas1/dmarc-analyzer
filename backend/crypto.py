"""
Secure encryption module for IMAP credentials
Uses AES-256-GCM encryption with monthly key rotation
Lean startup approach: file-based key storage on DO droplet
"""

import os
import json
import base64
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag
import logging

logger = logging.getLogger(__name__)

class CredentialEncryption:
    """
    AES-256-GCM encryption for IMAP credentials
    Implements monthly key rotation for enhanced security
    """
    
    def __init__(self, key_storage_path: str = "/opt/dmarc-analyzer/keys"):
        self.key_storage_path = key_storage_path
        self.current_key_file = os.path.join(key_storage_path, "current_key.json")
        self.backup_keys_dir = os.path.join(key_storage_path, "backup_keys")
        
        # Ensure directories exist
        os.makedirs(key_storage_path, exist_ok=True)
        os.makedirs(self.backup_keys_dir, exist_ok=True)
        
        # Set secure permissions
        os.chmod(key_storage_path, 0o700)
        os.chmod(self.backup_keys_dir, 0o700)
    
    def _generate_key(self) -> bytes:
        """Generate a new AES-256 key"""
        return AESGCM.generate_key(bit_length=256)
    
    def _get_current_key_info(self) -> Dict[str, Any]:
        """Get current encryption key info, create if doesn't exist"""
        try:
            if os.path.exists(self.current_key_file):
                with open(self.current_key_file, 'r') as f:
                    key_info = json.load(f)
                
                # Check if key needs rotation (monthly)
                created_date = datetime.fromisoformat(key_info['created_at'])
                if datetime.now() - created_date > timedelta(days=30):
                    logger.info("Key is older than 30 days, rotating...")
                    return self._rotate_key(key_info)
                
                return key_info
            else:
                # Create first key
                return self._create_new_key()
                
        except Exception as e:
            logger.error(f"Error getting key info: {e}")
            # If anything fails, create new key
            return self._create_new_key()
    
    def _create_new_key(self) -> Dict[str, Any]:
        """Create a new encryption key"""
        key = self._generate_key()
        key_id = secrets.token_hex(16)
        
        key_info = {
            'key_id': key_id,
            'key': base64.b64encode(key).decode(),
            'created_at': datetime.now().isoformat(),
            'rotated_from': None
        }
        
        # Save key info securely
        with open(self.current_key_file, 'w') as f:
            json.dump(key_info, f, indent=2)
        
        # Set secure file permissions
        os.chmod(self.current_key_file, 0o600)
        
        logger.info(f"Created new encryption key with ID: {key_id}")
        return key_info
    
    def _rotate_key(self, old_key_info: Dict[str, Any]) -> Dict[str, Any]:
        """Rotate to a new encryption key, backup old key"""
        try:
            # Backup old key
            backup_filename = f"key_{old_key_info['key_id']}_{old_key_info['created_at'][:10]}.json"
            backup_path = os.path.join(self.backup_keys_dir, backup_filename)
            
            with open(backup_path, 'w') as f:
                json.dump(old_key_info, f, indent=2)
            os.chmod(backup_path, 0o600)
            
            # Create new key
            new_key_info = self._create_new_key()
            new_key_info['rotated_from'] = old_key_info['key_id']
            
            # Update current key file
            with open(self.current_key_file, 'w') as f:
                json.dump(new_key_info, f, indent=2)
            
            logger.info(f"Rotated key from {old_key_info['key_id']} to {new_key_info['key_id']}")
            return new_key_info
            
        except Exception as e:
            logger.error(f"Key rotation failed: {e}")
            # If rotation fails, continue with old key
            return old_key_info
    
    def _get_key_by_id(self, key_id: str) -> Optional[bytes]:
        """Get encryption key by ID (for decryption of old data)"""
        try:
            # Check current key
            current_key_info = self._get_current_key_info()
            if current_key_info['key_id'] == key_id:
                return base64.b64decode(current_key_info['key'])
            
            # Check backup keys
            for filename in os.listdir(self.backup_keys_dir):
                if filename.startswith(f"key_{key_id}"):
                    backup_path = os.path.join(self.backup_keys_dir, filename)
                    with open(backup_path, 'r') as f:
                        key_info = json.load(f)
                    return base64.b64decode(key_info['key'])
            
            logger.error(f"Key not found for ID: {key_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving key {key_id}: {e}")
            return None
    
    def encrypt_credential(self, credential: str) -> Tuple[str, str]:
        """
        Encrypt a credential string
        Returns: (encrypted_data_base64, key_id)
        """
        try:
            key_info = self._get_current_key_info()
            key = base64.b64decode(key_info['key'])
            
            # Generate random nonce
            nonce = os.urandom(12)  # 96-bit nonce for GCM
            
            # Encrypt the credential
            aesgcm = AESGCM(key)
            ciphertext = aesgcm.encrypt(nonce, credential.encode('utf-8'), None)
            
            # Combine nonce + ciphertext
            encrypted_data = nonce + ciphertext
            encrypted_base64 = base64.b64encode(encrypted_data).decode()
            
            return encrypted_base64, key_info['key_id']
            
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise Exception(f"Failed to encrypt credential: {e}")
    
    def decrypt_credential(self, encrypted_data_base64: str, key_id: str) -> str:
        """
        Decrypt a credential string
        Args:
            encrypted_data_base64: Base64 encoded encrypted data
            key_id: ID of the key used for encryption
        Returns: decrypted credential string
        """
        try:
            key = self._get_key_by_id(key_id)
            if not key:
                raise Exception(f"Encryption key not found for ID: {key_id}")
            
            # Decode base64
            encrypted_data = base64.b64decode(encrypted_data_base64)
            
            # Extract nonce and ciphertext
            nonce = encrypted_data[:12]  # First 12 bytes are nonce
            ciphertext = encrypted_data[12:]  # Rest is ciphertext
            
            # Decrypt
            aesgcm = AESGCM(key)
            plaintext = aesgcm.decrypt(nonce, ciphertext, None)
            
            return plaintext.decode('utf-8')
            
        except InvalidTag:
            logger.error("Decryption failed: Invalid authentication tag")
            raise Exception("Invalid encrypted data or wrong key")
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise Exception(f"Failed to decrypt credential: {e}")
    
    def rotate_all_credentials(self, user_credentials: list) -> Dict[str, Any]:
        """
        Rotate encryption for all user credentials
        Used when key rotation happens
        Returns: {success_count, error_count, errors}
        """
        results = {
            'success_count': 0,
            'error_count': 0,
            'errors': []
        }
        
        try:
            old_key_info = None
            # Load current key info to check if rotation happened
            current_key_info = self._get_current_key_info()
            
            for cred in user_credentials:
                try:
                    # Decrypt with old key
                    if cred.get('encryption_key_id') != current_key_info['key_id']:
                        decrypted = self.decrypt_credential(
                            cred['password_encrypted'], 
                            cred['encryption_key_id']
                        )
                        
                        # Re-encrypt with new key
                        new_encrypted, new_key_id = self.encrypt_credential(decrypted)
                        
                        # Update credential record
                        cred['password_encrypted'] = new_encrypted
                        cred['encryption_key_id'] = new_key_id
                        
                        results['success_count'] += 1
                    
                except Exception as e:
                    error_msg = f"Failed to rotate credential {cred.get('id', 'unknown')}: {e}"
                    results['errors'].append(error_msg)
                    results['error_count'] += 1
                    logger.error(error_msg)
            
            return results
            
        except Exception as e:
            logger.error(f"Credential rotation failed: {e}")
            results['errors'].append(f"Rotation process failed: {e}")
            results['error_count'] += len(user_credentials)
            return results

# Global encryption instance
_encryption_instance = None

def get_credential_encryption() -> CredentialEncryption:
    """Get singleton encryption instance"""
    global _encryption_instance
    if _encryption_instance is None:
        # Use environment variable for key storage path in production
        key_path = os.getenv('DMARC_KEY_STORAGE_PATH', '/opt/dmarc-analyzer/keys')
        _encryption_instance = CredentialEncryption(key_path)
    return _encryption_instance 