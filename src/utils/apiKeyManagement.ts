// Utility for API key rotation and secure storage

/**
 * Generate a new API key token (e.g., using crypto.randomUUID or server-side logic).
 * In production, keys should be generated server-side and stored encrypted.
 */
export function generateApiKey(): string {
  // placeholder implementation
  return crypto.randomUUID();
}

/**
 * Rotate an existing API key: invalidate old key, generate new one, update storage.
 * Should be executed on server edge function or backend.
 */
export async function rotateApiKey(oldKey: string): Promise<string> {
  // TODO: implement rotation logic with your database / key management service
  const newKey = generateApiKey();
  // store newKey and mark oldKey as revoked
  return newKey;
}
