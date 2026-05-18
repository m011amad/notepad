# Notepad

A minimal notes app where each user's notes are protected by a secret key — no accounts, no email, just a key.

## Features

- **Key-based access** — enter your key to unlock your notes; wrong key shows nothing
- **Create new keys** — click the key icon 5 times on the login screen to open the registration flow
- **Full-screen editor** — open any note in a full-screen lined-paper view
- **Command palette** — press `⌘K` to search and jump to any note
- **File import** — drag and drop a PDF or text file onto the drop zone to create a note from its contents
- **Dark theme** throughout

## Tech

- [Next.js 16](https://nextjs.org) (App Router, Server Actions)
- [Turso](https://turso.tech) — SQLite edge database
- [shadcn/ui](https://ui.shadcn.com) — Button, Card, Input, Textarea, Badge, Separator, Dialog, Command, Calendar, Popover
- [unpdf](https://github.com/unjs/unpdf) — server-side PDF text extraction

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Turso database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

turso auth signup
turso db create notepad
turso db show notepad --url
turso db tokens create notepad
```

### 3. Configure environment

Copy `.env.local.example` to `.env.local` and fill in your Turso credentials:

```
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The database tables are created automatically on first request.

## How keys work

- Keys are SHA-256 hashed before they touch the database — the raw key is never stored
- Every note operation checks the hash server-side, so one user can never read or modify another's notes
- To **create** a new key: click the key icon on the login page 5 times until it turns green, then type your key in the command dialog that appears
- To **access** existing notes: just type your key and press Unlock
