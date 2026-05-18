import { createClient } from "@libsql/client";

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL is not set");
}

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      key_hash TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS keys (
      key_hash TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    )
  `);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_notes_key_hash ON notes (key_hash)`
  );
  /* migrate any pre-existing keys from notes into the keys table */
  await db.execute(`
    INSERT OR IGNORE INTO keys (key_hash, created_at)
    SELECT key_hash, MIN(created_at) FROM notes GROUP BY key_hash
  `);
}
