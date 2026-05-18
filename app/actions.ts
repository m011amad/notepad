"use server";

import { createHash, randomUUID } from "crypto";
import { db, initDb } from "@/lib/db";
import { extractText, getDocumentProxy } from "unpdf";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
};

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

async function getDb() {
  await initDb();
  return db;
}

/** Returns notes if the key exists, null if the key is not registered. */
export async function loginWithKey(key: string): Promise<Note[] | null> {
  const client = await getDb();
  const keyRow = await client.execute({
    sql: "SELECT 1 FROM keys WHERE key_hash = ?",
    args: [hashKey(key)],
  });
  if (keyRow.rows.length === 0) return null;

  const result = await client.execute({
    sql: "SELECT id, title, body, created_at FROM notes WHERE key_hash = ? ORDER BY created_at DESC",
    args: [hashKey(key)],
  });
  return result.rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    body: r.body as string,
    createdAt: r.created_at as number,
  }));
}

/** Registers a brand-new key. Throws if it already exists. */
export async function registerKey(key: string): Promise<void> {
  const client = await getDb();
  const existing = await client.execute({
    sql: "SELECT 1 FROM keys WHERE key_hash = ?",
    args: [hashKey(key)],
  });
  if (existing.rows.length > 0) throw new Error("Key already exists");
  await client.execute({
    sql: "INSERT INTO keys (key_hash, created_at) VALUES (?, ?)",
    args: [hashKey(key), Date.now()],
  });
}

export async function createNote(key: string, title: string, body: string): Promise<Note> {
  const client = await getDb();
  const note: Note = {
    id: randomUUID(),
    title: title.trim() || "Untitled",
    body,
    createdAt: Date.now(),
  };
  await client.execute({
    sql: "INSERT INTO notes (id, key_hash, title, body, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [note.id, hashKey(key), note.title, note.body, note.createdAt],
  });
  return note;
}

export async function updateNote(key: string, id: string, title: string, body: string): Promise<void> {
  const client = await getDb();
  await client.execute({
    sql: "UPDATE notes SET title = ?, body = ? WHERE id = ? AND key_hash = ?",
    args: [title, body, id, hashKey(key)],
  });
}

export async function deleteNote(key: string, id: string): Promise<void> {
  const client = await getDb();
  await client.execute({
    sql: "DELETE FROM notes WHERE id = ? AND key_hash = ?",
    args: [id, hashKey(key)],
  });
}

/** Import a dropped file (PDF or plain text) as a new note. */
export async function importFile(key: string, formData: FormData): Promise<Note> {
  const file = formData.get("file") as File;
  const name = file.name.replace(/\.[^.]+$/, ""); // strip extension for title
  const bytes = new Uint8Array(await file.arrayBuffer());

  let body = "";
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    body = text;
  } else {
    body = new TextDecoder().decode(bytes);
  }

  return createNote(key, name, body.trim());
}
