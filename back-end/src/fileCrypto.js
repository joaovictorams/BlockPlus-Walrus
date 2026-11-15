// Encryption for files stored on Walrus.
//
// Walrus blobs are public: anyone who knows a blob ID can read it. Block+ therefore
// encrypts every file with AES-256-GCM before uploading it.
//
// Stored format:  "BPW1" (4-byte magic) | IV (12 bytes) | ciphertext | auth tag (16 bytes)
//
// The key is WALRUS_ENCRYPTION_KEY (64 hex chars) in back-end/.env. Losing the key
// means losing access to every stored file, so back it up.

import crypto from 'crypto'

const MAGIC = Buffer.from('BPW1')
const IV_LEN = 12
const TAG_LEN = 16

function key() {
    const hex = process.env.WALRUS_ENCRYPTION_KEY || ''
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
        throw new Error('WALRUS_ENCRYPTION_KEY is missing or invalid (expected 64 hex characters). Run "npm run setup".')
    }
    return Buffer.from(hex, 'hex')
}

export function encryptFile(plain) {
    const iv = crypto.randomBytes(IV_LEN)
    const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
    cipher.setAAD(MAGIC)
    const body = Buffer.concat([cipher.update(plain), cipher.final()])
    return Buffer.concat([MAGIC, iv, body, cipher.getAuthTag()])
}

export function decryptFile(data) {
    if (data.length < MAGIC.length + IV_LEN + TAG_LEN || !data.subarray(0, MAGIC.length).equals(MAGIC)) {
        throw new Error('Stored blob is not a Block+ encrypted file')
    }
    const iv = data.subarray(MAGIC.length, MAGIC.length + IV_LEN)
    const tag = data.subarray(data.length - TAG_LEN)
    const body = data.subarray(MAGIC.length + IV_LEN, data.length - TAG_LEN)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv)
    decipher.setAAD(MAGIC)
    decipher.setAuthTag(tag)
    // final() throws if the data was tampered with or the key is wrong
    return Buffer.concat([decipher.update(body), decipher.final()])
}

// Fail fast at startup instead of on the first upload.
export function assertKeyConfigured() {
    key()
}
