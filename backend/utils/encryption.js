// AES-256-GCM encryption for Integration Management secrets at rest
// (Razorpay/Fship credentials in integration_configs.config_json).
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = (process.env.INTEGRATION_ENCRYPTION_KEY || "").trim();

if (!KEY_HEX || !/^[0-9a-fA-F]{64}$/.test(KEY_HEX)) {
  throw new Error(
    "INTEGRATION_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes). " +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}
const KEY = Buffer.from(KEY_HEX, "hex");

// Returns "iv:authTag:ciphertext" (all hex), or null for empty input so
// optional fields can round-trip as null instead of an encrypted empty string.
function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === "") return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

function decrypt(payload) {
  if (!payload) return null;
  const [ivHex, tagHex, dataHex] = String(payload).split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted value");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

const isSet = (value) => Boolean(value && String(value).trim());

module.exports = { encrypt, decrypt, isSet };
