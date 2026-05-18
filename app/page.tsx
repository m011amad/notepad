"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Plus,
  Trash2,
  LogOut,
  KeyRound,
  FileText,
  Maximize2,
  X,
  Search,
  Upload,
} from "lucide-react";
import { loginWithKey, registerKey, createNote, updateNote, deleteNote, importFile } from "./actions";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
};

const LINED_PAPER_STYLE: React.CSSProperties = {
  backgroundImage: [
    "linear-gradient(to right, transparent 63px, oklch(0.704 0.191 22.216 / 25%) 63px, oklch(0.704 0.191 22.216 / 25%) 64px, transparent 64px)",
    "repeating-linear-gradient(to bottom, transparent 0px, transparent 31px, oklch(1 0 0 / 7%) 31px, oklch(1 0 0 / 7%) 32px)",
  ].join(", "),
  backgroundAttachment: "local",
  lineHeight: "32px",
  paddingLeft: "80px",
  paddingTop: "8px",
};

export default function Page() {
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);

  /* small edit dialog */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  /* full-screen */
  const [fsNote, setFsNote] = useState<Note | null>(null);
  const [fsTitle, setFsTitle] = useState("");
  const [fsBody, setFsBody] = useState("");

  /* ⌘K search */
  const [commandOpen, setCommandOpen] = useState(false);

  /* 5-click key icon → register */
  const [iconClicks, setIconClicks] = useState(0);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [registerError, setRegisterError] = useState("");

  /* login */
  const [loginError, setLoginError] = useState("");
  const [isPending, startTransition] = useTransition();

  /* drop zone */
  const [isDragging, setIsDragging] = useState(false);
  const [importError, setImportError] = useState("");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!sessionKey) return;
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const allowed = ["application/pdf", "text/plain", "text/markdown"];
    const isAllowed = allowed.includes(file.type) || file.name.endsWith(".pdf") || file.name.endsWith(".md") || file.name.endsWith(".txt");
    if (!isAllowed) {
      setImportError("Only PDF and text files are supported.");
      return;
    }
    setImportError("");
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const created = await importFile(sessionKey, fd);
      setNotes((prev) => [created, ...prev]);
    });
  };

  /* ⌘K shortcut */
  useEffect(() => {
    if (!sessionKey) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [sessionKey]);

  /* reset click counter after 2 s of inactivity */
  useEffect(() => {
    if (iconClicks === 0) return;
    const t = setTimeout(() => setIconClicks(0), 2000);
    return () => clearTimeout(t);
  }, [iconClicks]);

  /* ── key icon clicks ── */
  const handleIconClick = () => {
    const next = iconClicks + 1;
    if (next >= 5) {
      setIconClicks(0);
      setNewKey("");
      setRegisterError("");
      setRegisterOpen(true);
    } else {
      setIconClicks(next);
    }
  };

  /* ── login ── */
  const handleLogin = (formData: FormData) => {
    const value = (formData.get("key") as string | null)?.trim() ?? "";
    if (!value) { setLoginError("Please enter your key"); return; }
    setLoginError("");
    startTransition(async () => {
      const result = await loginWithKey(value);
      if (result === null) {
        setLoginError("Key not found");
        return;
      }
      setNotes(result);
      setSessionKey(value);
    });
  };

  /* ── register new key ── */
  const handleRegister = async () => {
    const key = newKey.trim();
    if (!key) return;
    setRegisterError("");
    startTransition(async () => {
      try {
        await registerKey(key);
        setRegisterOpen(false);
        setNotes([]);
        setSessionKey(key);
      } catch {
        setRegisterError("That key is already taken. Choose another.");
      }
    });
  };

  const handleLogout = () => {
    setSessionKey(null);
    setNotes([]);
  };

  /* ── small dialog ── */
  const openNew = () => {
    setEditingNote(null);
    setTitle("");
    setBody("");
    setDialogOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setBody(note.body);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!sessionKey || (!title.trim() && !body.trim())) return;
    setDialogOpen(false);
    startTransition(async () => {
      if (editingNote) {
        await updateNote(sessionKey, editingNote.id, title, body);
        setNotes((prev) =>
          prev.map((n) => (n.id === editingNote.id ? { ...n, title, body } : n))
        );
      } else {
        const created = await createNote(sessionKey, title, body);
        setNotes((prev) => [created, ...prev]);
      }
    });
  };

  /* ── full-screen ── */
  const openFullscreen = (note: Note) => {
    setFsNote(note);
    setFsTitle(note.title);
    setFsBody(note.body);
  };

  const closeFullscreen = (save: boolean) => {
    if (save && sessionKey && fsNote) {
      const t = fsTitle;
      const b = fsBody;
      startTransition(async () => {
        await updateNote(sessionKey, fsNote.id, t, b);
        setNotes((prev) =>
          prev.map((n) => (n.id === fsNote.id ? { ...n, title: t, body: b } : n))
        );
      });
    }
    setFsNote(null);
  };

  /* ── delete ── */
  const handleDelete = (id: string) => {
    if (!sessionKey) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => { await deleteNote(sessionKey, id); });
  };

  /* ════════════════ LOGIN ════════════════ */
  if (!sessionKey) {
    const iconColor =
      iconClicks >= 4
        ? "text-green-500"
        : iconClicks >= 2
        ? "text-yellow-500"
        : "text-primary";

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="pb-2 text-center">
            <button
              type="button"
              onClick={handleIconClick}
              className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 transition-colors hover:bg-primary/20 focus:outline-none"
              aria-label="Secret: click 5 times to register"
            >
              <KeyRound className={`size-5 transition-colors ${iconColor}`} />
            </button>
            <CardTitle className="text-xl">Notepad</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your key to access your notes
            </p>
          </CardHeader>
          <CardContent>
            <form action={handleLogin} className="flex flex-col gap-3">
              <Input
                type="password"
                name="key"
                placeholder="Your key"
                aria-invalid={!!loginError}
                autoFocus
                onChange={() => setLoginError("")}
              />
              {loginError && (
                <p className="text-xs text-destructive">{loginError}</p>
              )}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Unlocking…" : "Unlock"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Register new key via Command */}
        <CommandDialog
          open={registerOpen}
          onOpenChange={(o) => { setRegisterOpen(o); if (!o) setNewKey(""); }}
          title="Create a new key"
          description="Type a key to create your notes space"
        >
          <CommandInput
            placeholder="Choose a key…"
            value={newKey}
            onValueChange={(v) => { setNewKey(v); setRegisterError(""); }}
          />
          <CommandList>
            {!newKey.trim() && (
              <CommandEmpty>Type a key to create your notes space</CommandEmpty>
            )}
            {newKey.trim() && (
              <>
                <CommandGroup heading="Create">
                  <CommandItem
                    value={newKey}
                    onSelect={handleRegister}
                    disabled={isPending}
                  >
                    <Plus />
                    Create key &ldquo;{newKey}&rdquo;
                  </CommandItem>
                </CommandGroup>
                {registerError && (
                  <>
                    <CommandSeparator />
                    <p className="px-4 py-2 text-xs text-destructive">
                      {registerError}
                    </p>
                  </>
                )}
              </>
            )}
          </CommandList>
        </CommandDialog>
      </div>
    );
  }

  /* ════════════════ FULL-SCREEN ════════════════ */
  if (fsNote) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center gap-3 border-b border-border px-6 py-3 shrink-0">
          <Input
            value={fsTitle}
            onChange={(e) => setFsTitle(e.target.value)}
            placeholder="Title"
            className="flex-1 border-none shadow-none focus-visible:ring-0 text-base font-semibold bg-transparent px-0"
          />
          <Button size="sm" onClick={() => closeFullscreen(true)} disabled={isPending}>
            Save
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => closeFullscreen(false)}>
            <X />
          </Button>
        </div>
        <textarea
          value={fsBody}
          onChange={(e) => setFsBody(e.target.value)}
          placeholder="Start writing…"
          autoFocus
          className="flex-1 min-h-0 w-full resize-none overflow-y-auto bg-background text-foreground text-sm outline-none pr-8 pb-16 font-mono"
          style={LINED_PAPER_STYLE}
        />
      </div>
    );
  }

  /* ════════════════ NOTES LIST ════════════════ */
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-primary" />
          <span className="font-semibold text-sm tracking-wide uppercase">Notepad</span>
          <Badge variant="secondary" className="text-xs">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="size-3.5" />
            <span className="hidden sm:inline text-xs text-muted-foreground">⌘K</span>
          </Button>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="size-3.5" />
            Lock
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Your Notes</h1>
          <Button size="sm" onClick={openNew} disabled={isPending}>
            <Plus />
            New Note
          </Button>
        </div>

        {/* drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mb-6 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:border-ring/50"
          }`}
        >
          <Upload className={`size-6 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground/40"}`} />
          <p className="text-xs">
            {isPending ? "Importing…" : "Drop a PDF or text file to create a note"}
          </p>
          {importError && <p className="text-xs text-destructive">{importError}</p>}
        </div>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <FileText className="size-10 opacity-20" />
            <p className="text-sm">No notes yet. Create your first one.</p>
            <Button variant="outline" size="sm" onClick={openNew}>
              <Plus />
              New Note
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {notes.map((note) => (
              <Card
                key={note.id}
                className="cursor-pointer hover:border-ring/50 transition-colors group"
                onClick={() => openEdit(note)}
              >
                <CardHeader className="pb-1 pr-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-medium line-clamp-1">
                      {note.title || "Untitled"}
                    </CardTitle>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          openFullscreen(note);
                        }}
                      >
                        <Maximize2 />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(note.id);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-3">
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {note.body || <span className="italic">No content</span>}
                  </p>
                  <p className="mt-3 text-[10px] text-muted-foreground/60">
                    {new Date(note.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* ── Command search ── */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search notes…" />
        <CommandList>
          <CommandEmpty>No notes found.</CommandEmpty>
          <CommandGroup heading="Notes">
            {notes.map((note) => (
              <CommandItem
                key={note.id}
                value={`${note.title} ${note.body}`}
                onSelect={() => {
                  setCommandOpen(false);
                  openFullscreen(note);
                }}
              >
                <FileText />
                <span className="flex-1 truncate">{note.title || "Untitled"}</span>
                <CommandShortcut>
                  {new Date(note.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => { setCommandOpen(false); openNew(); }}>
              <Plus />
              New Note
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* ── small edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[560px] max-w-[calc(100vw-2rem)] max-h-[90dvh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Note" : "New Note"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="Write something…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="resize-none font-mono"
              style={LINED_PAPER_STYLE}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
