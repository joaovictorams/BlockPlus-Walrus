import express from 'express'
import db from '../db.js'
import multer from 'multer'
import fs from 'fs'
import axios from 'axios'
import authMiddleware from '../middleware/authMiddleware.js'
import { encryptFile, decryptFile } from '../fileCrypto.js'

// Walrus storage backend.
//   upload   -> encrypt (AES-256-GCM) -> PUT {WALRUS_PUBLISHER}/v1/blobs?epochs=N
//   download -> GET {WALRUS_AGGREGATOR}/v1/blobs/{blobId} -> decrypt
//   delete   -> removes the file from Block+; the blob itself expires after its epochs
//              (deleting it on Walrus needs the Sui wallet that owns the blob object)
// Walrus blobs are publicly readable, which is why files are encrypted (see fileCrypto.js).

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024 // matches "up to 100MB" in the upload page

const router = express.Router()
const upload = multer({ dest: 'uploads/', limits: { fileSize: MAX_UPLOAD_BYTES } })

const PUBLISHER = () => (process.env.WALRUS_PUBLISHER || 'https://publisher.walrus-testnet.walrus.space').replace(/\/+$/, '')
const AGGREGATOR = () => (process.env.WALRUS_AGGREGATOR || 'https://aggregator.walrus-testnet.walrus.space').replace(/\/+$/, '')
const EPOCHS = () => Number(process.env.WALRUS_EPOCHS) || 5

router.use(authMiddleware)

// Walrus error bodies are either JSON ({ error: { message } }) or plain text.
function walrusError(err, fallback) {
    const d = err.response?.data
    if (typeof d === 'string' && d.trim()) return d.trim().slice(0, 300)
    return d?.error?.message || d?.message || fallback
}

// Get all files for the authenticated user
router.get('/', (req, res) => {
    const files = db.prepare('SELECT * FROM file WHERE user_id = ? ORDER BY createdAt DESC, id DESC').all(req.userId)
    res.json(files)
})

// multer errors (e.g. file too large) as JSON instead of Express' HTML error page
const singleFile = (req, res, next) =>
    upload.single('file')(req, res, (err) => {
        if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File is larger than 100MB' })
        if (err) return res.status(400).json({ error: err.message })
        next()
    })

// Upload a file
router.post('/upload', singleFile, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' })
        }

        const params = new URLSearchParams({ epochs: String(EPOCHS()) })
        // Optionally hand the Sui blob object to our own wallet, so it can be deleted/extended later.
        if (process.env.WALRUS_SEND_OBJECT_TO) params.set('send_object_to', process.env.WALRUS_SEND_OBJECT_TO)

        const encrypted = encryptFile(fs.readFileSync(req.file.path))

        const response = await axios.put(
            `${PUBLISHER()}/v1/blobs?${params}`,
            encrypted,
            {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': encrypted.length,
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            }
        )

        // Two possible answers: a new blob was stored, or identical content already exists.
        const created = response.data?.newlyCreated?.blobObject
        const certified = response.data?.alreadyCertified
        const blobId = created?.blobId || certified?.blobId
        if (!blobId) {
            throw new Error('Unexpected response from Walrus publisher')
        }
        const objectId = created?.id || null
        const endEpoch = created?.storage?.endEpoch ?? certified?.endEpoch ?? null

        db.prepare(`
            INSERT INTO file (hash, user_id, size, original_filename, sui_object_id, end_epoch)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(blobId, req.userId, req.file.size, req.file.originalname, objectId, endEpoch)

        fs.unlinkSync(req.file.path) // cleanup temp file

        return res.json({
            success: true,
            fid: blobId,
            blobId,
            endEpoch,
            filename: req.file.originalname,
            size: req.file.size,
        })
    } catch (err) {
        console.error('Upload error:', err.message)

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path)
        }

        if (err.response) {
            const status = err.response.status
            const error = status === 413
                ? 'File is too large for this Walrus publisher'
                : walrusError(err, 'Walrus upload error')
            return res.status(status || 500).json({ error })
        }
        if (err.request) {
            return res.status(503).json({ error: 'Walrus publisher unavailable. Please try again later.' })
        }
        return res.status(500).json({ error: err.message })
    }
})

// Download a file
router.get('/download/:hash', async (req, res) => {
    const { hash } = req.params

    try {
        const file = db.prepare('SELECT * FROM file WHERE hash = ? AND user_id = ?').get(hash, req.userId)
        if (!file) {
            return res.status(404).json({ error: 'File not found' })
        }

        const walrusResponse = await axios.get(
            `${AGGREGATOR()}/v1/blobs/${encodeURIComponent(hash)}`,
            { responseType: 'arraybuffer', maxContentLength: Infinity }
        )

        // Decrypt (and authenticate) the whole file before sending anything.
        let plain
        try {
            plain = decryptFile(Buffer.from(walrusResponse.data))
        } catch (e) {
            console.error('Decrypt error:', e.message)
            return res.status(500).json({ error: 'Stored file could not be decrypted (wrong key or corrupted data)' })
        }

        res.setHeader('Content-Disposition', `attachment; filename="${file.original_filename}"`)

        const ext = file.original_filename.split('.').pop().toLowerCase()
        const mimeMap = {
            txt: 'text/plain',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            pdf: 'application/pdf',
            mp4: 'video/mp4',
            zip: 'application/zip',
            rar: 'application/x-rar-compressed',
            json: 'application/json',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
        res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream')
        res.setHeader('Content-Length', plain.length)
        res.end(plain)
    } catch (err) {
        console.error('Download error:', err.message)

        if (err.response?.status === 404) {
            return res.status(404).json({
                error: 'File not found on Walrus. Its storage period may have expired (testnet data is also wiped periodically).',
            })
        }
        if (err.response) {
            return res.status(err.response.status || 500).json({ error: 'Walrus download error' })
        }
        if (err.request) {
            return res.status(503).json({ error: 'Walrus aggregator unavailable. Please try again later.' })
        }
        return res.status(500).json({ error: 'Internal server error' })
    }
})

// Delete a file. The frontend calls DELETE /file/:hash; /file/delete/:hash is kept for compatibility.
async function deleteHandler(req, res) {
    const { hash } = req.params

    try {
        const file = db.prepare('SELECT * FROM file WHERE hash = ? AND user_id = ?').get(hash, req.userId)
        if (!file) {
            return res.status(404).json({
                error: 'File not found or you do not have permission to delete this file',
            })
        }

        const result = db.prepare('DELETE FROM file WHERE hash = ? AND user_id = ?').run(hash, req.userId)
        if (result.changes === 0) {
            throw new Error('Failed to delete file from database')
        }

        return res.json({
            success: true,
            message: 'File removed from Block+. The Walrus blob expires automatically at the end of its storage period.',
            deletedFile: {
                hash: file.hash,
                filename: file.original_filename,
                size: file.size,
            },
        })
    } catch (err) {
        console.error('Delete error:', err.message)
        return res.status(500).json({ error: err.message || 'Internal server error' })
    }
}

router.delete('/delete/:hash', deleteHandler)
router.delete('/:hash', deleteHandler)

export default router
