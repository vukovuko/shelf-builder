"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Nedostaje token za resetovanje lozinke");
      return;
    }

    if (password.length < 8) {
      setError("Lozinka mora imati najmanje 8 karaktera");
      return;
    }

    if (password !== confirmPassword) {
      setError("Lozinke se ne poklapaju");
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        throw new Error(
          result.error.message || "Greska pri postavljanju lozinke",
        );
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Greska pri postavljanju lozinke",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="flex justify-center">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Neispravan link</h1>
            <p className="text-muted-foreground">
              Link za postavljanje lozinke je neispravan ili je istekao. Molimo
              zatražite novi link.
            </p>
          </div>
          <Button onClick={() => router.push("/")} className="w-full">
            Vrati se na početnu
          </Button>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Lozinka postavljena!</h1>
            <p className="text-muted-foreground">
              Vaša lozinka je uspešno postavljena. Sada se možete prijaviti.
            </p>
          </div>
          <Button onClick={() => router.push("/")} className="w-full">
            Prijavi se
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <KeyRound className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Postavite lozinku</h1>
          <p className="text-muted-foreground">
            Unesite novu lozinku za vaš nalog
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova lozinka</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Najmanje 8 karaktera"
              required
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Potvrdite lozinku</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ponovite lozinku"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Postavljanje..." : "Postavi lozinku"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
