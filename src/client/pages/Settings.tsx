"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, Download, Trash2 } from "lucide-react";
import { useImportCsv, useWipe, useSessions } from "@/client/hooks/use-sessions";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
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

export function Settings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const sessions = useSessions();
  const importCsv = useImportCsv();
  const wipe = useWipe();
  const [lastImport, setLastImport] = useState<string | null>(null);

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
