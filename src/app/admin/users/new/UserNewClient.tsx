"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export function UserNewClient() {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [role, setRole] = useState("user");

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSaving(true);
		setError(null);

		const formData = new FormData(e.currentTarget);
		const email = (formData.get("email") as string).trim();
		const phone = (formData.get("phone") as string).trim();

		// Validate at least one contact method
		if (!email && !phone) {
			setError("Morate uneti email ili telefon");
			setSaving(false);
			return;
		}

		const data = {
			name: formData.get("name") as string,
			email: email || undefined,
			phone: phone || undefined,
			role,
		};

		try {
			const res = await fetch("/api/admin/users/create", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			const json = await res.json();

			if (!res.ok) {
				throw new Error(json.error || "Greska pri kreiranju");
			}

			toast.success(json.message || "Korisnik kreiran");
			router.push("/admin/users");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Greska pri kreiranju";
			setError(message);
			toast.error(message);
			setSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/admin/users">
						<ArrowLeft className="h-5 w-5" />
					</Link>
				</Button>
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold">Novi korisnik</h1>
					<p className="text-sm sm:text-base text-muted-foreground">
						Unesite email ili telefon (ili oba)
					</p>
				</div>
			</div>

			<Card className="p-6">
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="name">Ime i prezime *</Label>
							<Input
								id="name"
								name="name"
								required
								placeholder="npr. Petar Petrovic"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="role">Uloga</Label>
							<Select value={role} onValueChange={setRole}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="user">Korisnik</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email adresa</Label>
							<Input
								id="email"
								name="email"
								type="email"
								placeholder="npr. petar@example.com"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="phone">Telefon</Label>
							<Input
								id="phone"
								name="phone"
								type="tel"
								placeholder="npr. 0641234567"
							/>
						</div>
					</div>

					<div className="space-y-3 rounded-lg bg-muted p-4 text-sm">
						<div className="flex items-start gap-3">
							<Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
							<div>
								<p className="font-medium">Sa emailom</p>
								<p className="text-muted-foreground">
									Korisnik dobija email za postavljanje lozinke i moze se prijaviti
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
							<div>
								<p className="font-medium">Samo telefon</p>
								<p className="text-muted-foreground">
									Korisnik ne moze da se prijavi - admin upravlja njihovim nalozima
								</p>
							</div>
						</div>
					</div>

					{error && (
						<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
					)}

					<div className="flex justify-end gap-2 pt-4">
						<Button type="button" variant="outline" asChild>
							<Link href="/admin/users">Odustani</Link>
						</Button>
						<Button type="submit" disabled={saving}>
							{saving ? "Kreiranje..." : "Kreiraj korisnika"}
						</Button>
					</div>
				</form>
			</Card>
		</div>
	);
}
