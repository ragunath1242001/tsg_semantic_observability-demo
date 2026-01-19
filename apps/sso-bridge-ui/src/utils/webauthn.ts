/**
 * WebAuthn utility functions for base64url conversion
 * Used for converting between browser WebAuthn API ArrayBuffers and base64url strings
 */

/**
 * Convert a base64url string to an ArrayBuffer
 * @param base64url - Base64url encoded string
 * @returns ArrayBuffer
 */
export const base64urlToArrayBuffer = (base64url: string): ArrayBuffer => {
  // Convert base64url to base64
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Convert an ArrayBuffer to a base64url string
 * @param buffer - ArrayBuffer to convert
 * @returns Base64url encoded string
 */
export const arrayBufferToBase64url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  // Convert base64 to base64url
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};
