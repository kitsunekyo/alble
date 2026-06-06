"use client";

import { useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Loader2, Upload, Download, Trash2, KeyRound, Eye, EyeOff, Sun, Moon, Monitor } from "lucide-react";
import { useImportCsv, useWipe, useSessions } from "@/client/hooks/use-sessions";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/client/components/ui/alert-dialog";
import { toast } from "sonner";

const themeOptions = [
  { key: "system", label: "System", icon: Monitor },
  { key: "light", label: "Hell", icon: Sun },
  { key: "dark", label: "Dunkel", icon: Moon },
] as const;

export function Settings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const sessions = useSessions();
  const { theme, setTheme } = useTheme();
  const importCsv = useImportCsv();
  const wipe = useWipe();
  const [lastImport, setLastImport] = useState<string | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  function onFile(file: File | null) {
    if (!file) return;
    importCsv.mutate(file, {
      onSuccess: (r) => {
        setLastImport(
          `Importiert: ${r.sessions} Sessions, ${r.steps} Einheiten` +
            (r.parseErrors.length > 0 ? ` (${r.parseErrors.length} Fehler übersprungen)` : ""),
        );
        toast.success("CSV importiert");
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>

      <Card className="p-4 space-y-3">
        <div>
          <h2 className="font-medium">CSV importieren</h2>
          <p className="text-sm text-muted-foreground">
            Erwartet Spalten: <code>global_day, step, trennungszeit_seconds, bewertung</code>.
            Optional kann <code>date</code> im Format <code>YYYY-MM-DD</code> enthalten sein.
            Sessions mit existierender <code>global_day</code> werden übersprungen.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex gap-2 items-center">
          <Button onClick={() => fileRef.current?.click()} disabled={importCsv.isPending}>
            {importCsv.isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Upload className="size-4 mr-2" />
            )}
            Datei wählen
          </Button>
          {lastImport && <span className="text-sm text-muted-foreground">{lastImport}</span>}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <h2 className="font-medium">Daten exportieren</h2>
          <p className="text-sm text-muted-foreground">
            Lädt alle Schritte als CSV mit Datum und Import-ID herunter.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/api/export/csv">
            <Download className="size-4 mr-2" /> CSV herunterladen
          </a>
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <h2 className="font-medium">Design</h2>
          <p className="text-sm text-muted-foreground">
            Wähle zwischen hellem, dunklem oder System-Design.
          </p>
        </div>
        <div className="flex gap-2">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = (theme ?? "system") === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setTheme(opt.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <h2 className="font-medium">Passwort ändern</h2>
          <p className="text-sm text-muted-foreground">
            Lege ein neues Passwort für den Zugang fest.
          </p>
        </div>
        <div className="space-y-3">
          <Input
            type={showPw ? "text" : "password"}
            placeholder="Aktuelles Passwort"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
          />
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              placeholder="Neues Passwort"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <Button
            onClick={async () => {
              if (!currentPw || !newPw) {
                toast.error("Beide Felder ausfüllen");
                return;
              }
              setChangingPw(true);
              try {
                const res = await fetch("/api/auth/change-password", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  toast.error(data.error ?? "Fehler");
                  return;
                }
                toast.success("Passwort geändert");
                setCurrentPw("");
                setNewPw("");
              } catch {
                toast.error("Verbindungsfehler");
              } finally {
                setChangingPw(false);
              }
            }}
            disabled={changingPw}
          >
            {changingPw ? <Loader2 className="size-4 animate-spin mr-2" /> : <KeyRound className="size-4 mr-2" />}
            Passwort ändern
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3 border-destructive/40">
        <div>
          <h2 className="font-medium text-destructive">Daten löschen</h2>
          <p className="text-sm text-muted-foreground">
            Entfernt alle Sessions und Einheiten unwiderruflich.
            {sessions.data ? ` Aktuell ${sessions.data.length} Sessions in der DB.` : ""}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={wipe.isPending}>
              <Trash2 className="size-4 mr-2" /> Alle Daten löschen
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Wirklich alle Daten löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Sessions und Einheiten werden unwiderruflich entfernt. Vorher exportieren?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  wipe.mutate(undefined, {
                    onSuccess: () => toast.success("Alle Daten gelöscht"),
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}
