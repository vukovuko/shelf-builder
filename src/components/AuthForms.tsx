"use client";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signIn, signUp } from "@/lib/auth-client";
import { validatePassword } from "@/lib/password-validation";

interface AuthFormsProps {
  onSuccess?: () => void;
}

export function AuthForms({ onSuccess }: AuthFormsProps = {}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPasswordError(null);
    setEmailError(null);

    // Validate email
    const emailValidation = z
      .email({ message: "Neispravna email adresa" })
      .safeParse(email);
    if (!emailValidation.success) {
      setEmailError(emailValidation.error.issues[0].message);
      setLoading(false);
      return;
    }

    // Validate password complexity for registration only
    if (mode === "register") {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        setPasswordError(passwordValidation.error!);
        setLoading(false);
        return;
      }
    }

    try {
      if (mode === "register") {
        const result = await signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        });

        if (result.error) {
          const errorMsg = result.error.message || "Registracija nije uspela";
          setError(errorMsg);
          return;
        }

        // auto switch to login after successful registration
        setMode("login");
        setPassword("");
        setError("Uspešno ste se registrovali! Sada se prijavite.");
      } else {
        const result = await signIn.email({
          email,
          password,
        });

        if (result.error) {
          // Security-conscious error message - don't reveal if email exists or not
          const errorMsg = "Pogrešni kredencijali";
          setError(errorMsg);
          return;
        }

        // Call onSuccess callback after successful login
        onSuccess?.();
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      // Generic error message for security
      const errorMsg =
        mode === "login" ? "Pogrešni kredencijali" : "Registracija nije uspela";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    setPasswordError(null);
    setEmailError(null);

    try {
      const result = await signIn.social({
        provider: "google",
        callbackURL: window.location.href,
      });

      if (result?.error) {
        const errorMsg = "Google prijava nije uspela";
        setError(errorMsg);
        return;
      }

      // Success will redirect, but just in case:
      onSuccess?.();
    } catch (err: any) {
      console.error("Google auth error:", err);
      const errorMsg = "Google prijava nije uspela";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tabs
      defaultValue="login"
      value={mode}
      onValueChange={(v) => setMode(v as "login" | "register")}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Prijava</TabsTrigger>
        <TabsTrigger value="register">Registracija</TabsTrigger>
      </TabsList>

      <TabsContent value="login" className="space-y-4 min-h-[520px]">
        <form onSubmit={submit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email-login">Email</Label>
            <div className="relative">
              <Input
                id="email-login"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                placeholder="vas@email.com"
                type="email"
                required
                className={emailError ? "border-destructive" : ""}
              />
              {emailError && (
                <div className="absolute left-0 top-full mt-1 text-xs text-destructive">
                  {emailError}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2 pb-2">
            <Label htmlFor="password-login">Lozinka</Label>
            <div className="relative">
              <Input
                id="password-login"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="••••••••"
                type="password"
                required
                className={passwordError ? "border-destructive" : ""}
              />
              {passwordError && (
                <div className="absolute left-0 top-full mt-1 text-xs text-destructive">
                  {passwordError}
                </div>
              )}
            </div>
          </div>
          <div className="min-h-[0.5rem]">
            {error && (
              <div className="text-sm text-destructive px-1 py-2 bg-destructive/10 rounded">
                {error}
              </div>
            )}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Učitavanje..." : "Prijavi se"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              ili
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full"
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Prijava sa Google
        </Button>
      </TabsContent>

      <TabsContent value="register" className="space-y-4 min-h-[520px]">
        <form onSubmit={submit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Ime</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Unesite vaše ime"
              type="text"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-register">Email</Label>
            <div className="relative">
              <Input
                id="email-register"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                placeholder="vas@email.com"
                type="email"
                required
                className={emailError ? "border-destructive" : ""}
              />
              {emailError && (
                <div className="absolute left-0 top-full mt-1 text-xs text-destructive">
                  {emailError}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2 pb-2">
            <Label htmlFor="password-register">Lozinka</Label>
            <div className="relative">
              <Input
                id="password-register"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="••••••••"
                type="password"
                required
                className={passwordError ? "border-destructive" : ""}
              />
              {passwordError && (
                <div className="absolute left-0 top-full mt-1 text-xs text-destructive">
                  {passwordError}
                </div>
              )}
            </div>
          </div>
          <div className="min-h-[0.5rem]">
            {error && (
              <div className="text-sm text-destructive px-1 py-2 bg-destructive/10 rounded">
                {error}
              </div>
            )}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Učitavanje..." : "Registruj se"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              ili
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full"
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Prijava sa Google
        </Button>
      </TabsContent>
    </Tabs>
  );
}
