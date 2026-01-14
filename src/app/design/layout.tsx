import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { materials } from "@/db/schema";
import { DesignLayoutClient } from "./DesignLayoutClient";

export default async function DesignLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Fetch session and materials in parallel
	const [session, dbMaterials] = await Promise.all([
		auth.api.getSession({
			headers: await headers(),
		}),
		db.select().from(materials),
	]);

	// Serialize session for client (only pass what's needed)
	const initialSession = session
		? {
				user: {
					id: session.user.id,
					name: session.user.name,
					email: session.user.email,
					image: session.user.image,
				},
			}
		: null;

	// Serialize materials for client
	const serializedMaterials = dbMaterials.map((m) => ({
		id: m.id,
		name: m.name,
		price: m.price,
		img: m.img,
		thickness: m.thickness,
		stock: m.stock,
		category: m.category,
	}));

	return (
		<DesignLayoutClient
			initialSession={initialSession}
			initialMaterials={serializedMaterials}
		>
			{children}
		</DesignLayoutClient>
	);
}
