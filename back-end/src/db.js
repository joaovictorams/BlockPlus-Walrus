// Uses Node's built-in SQLite (node:sqlite), so no native module has to be compiled.
import { DatabaseSync } from 'node:sqlite';

const raw = new DatabaseSync('./database.sqlite');

// better-sqlite3-style facade: node:sqlite rejects undefined parameters, so map them to NULL.
const fix = (args) => args.map((a) => (a === undefined ? null : a));
const db = {
    exec: (sql) => raw.exec(sql),
    prepare(sql) {
        const st = raw.prepare(sql);
        return {
            run: (...a) => st.run(...fix(a)),
            get: (...a) => st.get(...fix(a)),
            all: (...a) => st.all(...fix(a)),
        };
    },
};

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        wallet TEXT,
        username TEXT UNIQUE,
        tx_digest TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS file (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        hash TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        size REAL NOT NULL,
        original_filename TEXT NOT NULL,
        sui_object_id TEXT,
        end_epoch INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
`);

// Migrations for databases created by earlier versions (adds columns, never drops data).
function addColumnIfMissing(table, column, type) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}
addColumnIfMissing('users', 'tx_digest', 'TEXT');
addColumnIfMissing('file', 'sui_object_id', 'TEXT');
addColumnIfMissing('file', 'end_epoch', 'INTEGER');

// One registration per payment: a transaction digest can't be reused.
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_tx_digest ON users (tx_digest) WHERE tx_digest IS NOT NULL`);

console.log('✅ Database ready');

export default db;
