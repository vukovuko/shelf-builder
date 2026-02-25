"use client";

import { useState, useRef } from "react";
import posthog from "posthog-js";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface PublicContactFormProps {
  userName?: string;
  userEmail?: string;
}

export function PublicContactForm({
  userName = "",
  userEmail = "",
}: PublicContactFormProps) {
  const [sending, setSending] = useState(false);
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || name.trim().length < 2) {
      toast.error("Ime i prezime je obavezno (min 2 karaktera)");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      toast.error("Unesite email ili broj telefona");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Unesite ispravan email");
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      toast.error("Poruka mora imati najmanje 10 karaktera");
      return;
    }
    if (!turnstileToken) {
      toast.error("Molimo sačekajte verifikaciju");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/public-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          message: message.trim(),
          turnstileToken,
        }),
      });

      if (res.ok) {
        posthog.capture("public_contact_submitted");
        toast.success(
          "Poruka je uspešno poslata! Javićemo vam se u najkraćem mogućem roku.",
        );
        setName("");
        setEmail("");
        setPhone("");
        setMessage("");
        setTurnstileToken(null);
        turnstileRef.current?.reset();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Greška pri slanju poruke");
      }
    } catch {
      toast.error(
        "Neočekivana greška. Proverite internet konekciju i pokušajte ponovo.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Ime i prezime <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Vaše ime i prezime"
          disabled={sending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vas@email.com"
          disabled={sending}
        />
        <p className="text-xs text-muted-foreground">
          Obavezno ako ne unosite broj telefona
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Broj telefona</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+381 60 123 4567"
          disabled={sending}
        />
        <p className="text-xs text-muted-foreground">
          Obavezno ako ne unosite email
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">
          Poruka <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Vaša poruka..."
          rows={5}
          disabled={sending}
        />
        <p className="text-xs text-muted-foreground">Minimum 10 karaktera</p>
      </div>

      <Turnstile
        ref={turnstileRef}
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        options={{ language: "sr" }}
        onSuccess={setTurnstileToken}
        onError={() => setTurnstileToken(null)}
        onExpire={() => setTurnstileToken(null)}
      />

      <Button
        type="submit"
        disabled={sending || !turnstileToken}
        className="w-full sm:w-auto"
      >
        {sending ? (
          "Slanje..."
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Pošalji poruku
          </>
        )}
      </Button>
    </form>
  );
}
