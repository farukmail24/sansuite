import crypto from "crypto";
import QRCode from "qrcode";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Generate a random Base32 TOTP secret (32 chars / 160 bits)
 */
export function generateTotpSecret(): string {
  const buffer = crypto.randomBytes(20);
  let secret = "";
  let bits = 0;
  let value = 0;

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      secret += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    secret += ALPHABET[(value << (5 - bits)) & 31];
  }
  return secret;
}

/**
 * Decode Base32 string to Buffer
 */
function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const val = ALPHABET.indexOf(cleaned[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Generate 6-digit TOTP token for given Base32 secret and counter
 */
export function generateTotpToken(secret: string, counter: number): string {
  const secretBuffer = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  
  // Write counter as 64-bit big-endian integer
  let tempCounter = counter;
  for (let i = 7; i >= 0; i--) {
    buffer[i] = tempCounter & 0xff;
    tempCounter = Math.floor(tempCounter / 256);
  }

  const hmac = crypto.createHmac("sha1", secretBuffer);
  hmac.update(buffer);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = (code % 1_000_000).toString().padStart(6, "0");
  return otp;
}

/**
 * Verify TOTP token with ±1 period (±30 sec) drift window
 */
export function verifyTotpToken(secret: string, token: string, window = 1): boolean {
  if (!secret || !token || token.trim().length !== 6) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  const cleanToken = token.trim();

  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const calculated = generateTotpToken(secret, currentCounter + errorWindow);
    if (crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(cleanToken))) {
      return true;
    }
  }

  return false;
}

/**
 * Generate otpauth:// URI for authenticator apps (Google / Microsoft Authenticator)
 */
export function getOtpAuthUrl(email: string, secret: string, issuer = "SanSuite"): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate Base64 Data URL PNG image of QR Code for authenticator scanning
 */
export async function generateQrCodeDataUrl(otpAuthUrl: string): Promise<string> {
  return await QRCode.toDataURL(otpAuthUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 220,
    color: {
      dark: "#1e1b4b",
      light: "#ffffff",
    },
  });
}
