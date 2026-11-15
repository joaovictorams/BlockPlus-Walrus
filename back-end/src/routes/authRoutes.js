import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db.js'
import { verifyRegistrationPayment, PaymentError } from '../suiPayment.js'

const router = express.Router()

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/

const sign = (user) =>
    jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' })

// Register a new user endpoint /auth/register
router.post('/register', async (req, res) => {
    const { wallet, username, password, transactionHash } = req.body || {}

    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
        return res.status(400).json({ message: 'Username must be 3–32 characters: letters, numbers, ".", "_" or "-".' })
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 200) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
        return res.status(409).json({ message: 'That username is already taken.' })
    }
    if (transactionHash && db.prepare('SELECT 1 FROM users WHERE tx_digest = ?').get(transactionHash)) {
        return res.status(409).json({ message: 'This payment was already used to create an account.' })
    }

    try {
        await verifyRegistrationPayment({ digest: transactionHash, wallet })
    } catch (err) {
        if (err instanceof PaymentError) return res.status(402).json({ message: err.message })
        console.error('Payment verification error:', err.message)
        return res.status(503).json({ message: 'Could not verify the payment right now. Please try again.' })
    }

    try {
        const hashedPassword = bcrypt.hashSync(password, 10)
        const result = db
            .prepare('INSERT INTO users (username, password, wallet, tx_digest) VALUES (?, ?, ?, ?)')
            .run(username, hashedPassword, wallet, transactionHash)
        const token = sign({ id: Number(result.lastInsertRowid), username })
        res.json({ token, wallet, username })
    } catch (err) {
        console.error('Register error:', err.message)
        if (/UNIQUE/i.test(err.message)) {
            return res.status(409).json({ message: 'That username or payment is already in use.' })
        }
        res.status(500).json({ message: 'Could not create the account.' })
    }
})

router.post('/login', (req, res) => {
    const { username, password } = req.body || {}
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' })
    }

    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
        // Same answer for unknown user and wrong password, so usernames can't be probed.
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: 'Invalid username or password.' })
        }
        res.json({ token: sign(user), wallet: user.wallet, username: user.username })
    } catch (err) {
        console.error('Login error:', err.message)
        res.status(500).json({ message: 'Login failed. Please try again.' })
    }
})

export default router
