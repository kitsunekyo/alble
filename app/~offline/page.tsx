export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold">Offline</h1>
      <p className="text-muted-foreground">
        Du bist offline. Die Seite wird geladen, sobald wieder eine Verbindung
        besteht.
      </p>
    </div>
  );
}
