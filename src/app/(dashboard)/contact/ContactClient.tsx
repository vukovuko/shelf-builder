"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Send, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ContactClientProps {
  wardrobes: { id: string; name: string }[];
  userName: string;
  userEmail: string;
}

export function ContactClient({
  wardrobes,
  userName,
  userEmail,
}: ContactClientProps) {
  const [sending, setSending] = useState(false);
  const [name, setName] = useState(userName || "");
  const [email, setEmail] = useState(userEmail || "");
  const [phone, setPhone] = useState("");
  const [wardrobeId, setWardrobeId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
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
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          wardrobeId: wardrobeId || null,
          message: message.trim(),
          turnstileToken,
        }),
      });

      if (res.ok) {
        toast.success(
          "Poruka je uspešno poslata! Javićemo vam se u najkraćem mogućem roku.",
        );
        setMessage("");
        setWardrobeId("");
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
    <div className="container max-w-7xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Kontakt</h1>
          <p className="text-muted-foreground mt-1">
            Imate pitanje ili sugestiju? Pošaljite nam poruku.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        {/* Name field */}
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

        {/* Email field */}
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

        {/* Phone field */}
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

        {/* Wardrobe combobox (optional) */}
        {wardrobes.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="wardrobe">Orman (opciono)</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="wardrobe"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between font-normal"
                  disabled={sending}
                >
                  {wardrobeId
                    ? wardrobes.find((w) => w.id === wardrobeId)?.name
                    : "Izaberite orman..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Pretrazi ormane..." />
                  <CommandList>
                    <CommandEmpty>Nema ormana</CommandEmpty>
                    <CommandGroup>
                      {wardrobes.map((w) => (
                        <CommandItem
                          key={w.id}
                          value={w.name}
                          onSelect={() => {
                            setWardrobeId(w.id);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              wardrobeId === w.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {w.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Ako se vaše pitanje odnosi na određeni orman
            </p>
          </div>
        )}

        {/* Message textarea */}
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

        {/* Turnstile widget */}
        <Turnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          options={{ language: "sr" }}
          onSuccess={setTurnstileToken}
          onError={() => setTurnstileToken(null)}
          onExpire={() => setTurnstileToken(null)}
        />

        {/* Submit button */}
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
    </div>
  );
}
