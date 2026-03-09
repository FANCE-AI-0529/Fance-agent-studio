/**
 * @file _shared/crypto.ts
 * @description Shared AES-256-GCM encryption/decryption for API key storage
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */

const SALT = "fance-api-key-encryption-v1";

async function getEncryptionKey(usage: KeyUsage[]): Promise<CryptoKey> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode(SALT), info: new Uint8Array(0) },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    usage
  );
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: base64([12-byte IV][ciphertext+tag])
 */
export async function encryptAES(plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getEncryptionKey(["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Falls back to legacy XOR decryption for migration.
 */
export async function decryptAES(encryptedBase64: string): Promise<string> {
  try {
    const raw = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    // Format: [12-byte IV][ciphertext+tag], min 28 bytes (12 IV + 16 tag)
    if (raw.length < 28) {
      return decryptLegacyXOR(encryptedBase64);
    }
    const iv = raw.slice(0, 12);
    const ciphertext = raw.slice(12);
    const key = await getEncryptionKey(["decrypt"]);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    // Fallback to legacy XOR for migration period
    return decryptLegacyXOR(encryptedBase64);
  }
}

/**
 * Legacy XOR decryption — kept temporarily for migration only.
 * @deprecated Will be removed after all keys are re-encrypted.
 */
function decryptLegacyXOR(encryptedKey: string): string {
  const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(0, 32) || '';
  const keyBytes = new TextEncoder().encode(encryptionKey);
  const binaryString = atob(encryptedKey);
  const encryptedBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    encryptedBytes[i] = binaryString.charCodeAt(i);
  }
  const decrypted = new Uint8Array(encryptedBytes.length);
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(decrypted);
}
