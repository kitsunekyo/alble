"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Card } from "@/client/components/ui/card";

export function LoginPage() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const redirectTo = searchParams.get("redirect") ?? "/";

  useEffect(() => {
    fetch("/api/auth/check")
      .then((res) => {
        if (res.ok) {
          window.location.href = redirectTo;
        }
      })
      .finally(() => setChecking(false));
  }, [redirectTo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login fehlgeschlagen");
        return;
      }
      window.location.href = redirectTo;
    } catch {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-dvh p-4">
      <Card className="w-full max-w-sm p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-2">🐶</div>
          <h1 className="text-2xl font-semibold">Alble</h1>
          <p className="text-sm text-muted-foreground">Allein-Bleib-Training</p>
          <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto">
            Dokumentiere dein Training, tracke Fortschritte und hilf deinem
            Hund, entspannt allein zu bleiben. 🐾
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading || !password}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Anmelden"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
