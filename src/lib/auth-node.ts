// Password hashing menggunakan Node's built-in scrypt. File ini Node-only,
// **JANGAN** di-import dari middleware atau komponen Edge.
import { randomBytes, scrypt, timingSafeEqual } from "crypto";

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16);
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt.toString("hex")}:${derivedKey.toString("hex")}`);
    });
  });
}

export function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [saltHex, keyHex] = stored.split(":");
    if (!saltHex || !keyHex) return resolve(false);
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(keyHex, "hex");
    scrypt(password, salt, expected.length, (err, derivedKey) => {
      if (err) reject(err);
      else {
        try {
          resolve(timingSafeEqual(expected, derivedKey));
        } catch {
          resolve(false);
        }
      }
    });
  });
}
