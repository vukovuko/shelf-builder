"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Ruler, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Scene } from "@/components/Scene";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { useShelfStore, type Material } from "@/lib/store";
import { applyWardrobeSnapshot } from "@/lib/serializeWardrobe";

interface WardrobePreviewClientProps {
	wardrobe: {
		id: string;
		name: string;
		data: Record<string, unknown>;
		thumbnail: string | null;
		createdAt: string;
		updatedAt: string;
		userName: string | null;
		userEmail: string | null;
	};
	materials: Material[];
}

export function WardrobePreviewClient({
	wardrobe,
	materials,
}: WardrobePreviewClientProps) {
	const wardrobeRef = useRef<any>(null);
	const [isLoaded, setIsLoaded] = useState(false);
	const setMaterials = useShelfStore((state) => state.setMaterials);

	// Store values for display
	const width = useShelfStore((state) => state.width);
	const height = useShelfStore((state) => state.height);
	const depth = useShelfStore((state) => state.depth);

	// Load materials and wardrobe data on mount
	useEffect(() => {
		// Set materials first
		setMaterials(materials);

		// Then apply wardrobe snapshot
		if (wardrobe.data) {
			applyWardrobeSnapshot(wardrobe.data);
		}

		setIsLoaded(true);
	}, [materials, wardrobe.data, setMaterials]);

	const handleDownloadThumbnail = () => {
		if (wardrobe.thumbnail) {
			const link = document.createElement("a");
			link.href = wardrobe.thumbnail;
			link.download = `${wardrobe.name}-thumbnail.png`;
			link.click();
		}
	};

	if (!isLoaded) {
		return (
			<div className="flex items-center justify-center h-96">
				<div className="flex flex-col items-center gap-4">
					<div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
					<p className="text-sm text-muted-foreground">Učitavanje...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" asChild>
						<Link href="/admin/wardrobes">
							<ArrowLeft className="h-5 w-5" />
						</Link>
					</Button>
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold">{wardrobe.name}</h1>
						<p className="text-sm text-muted-foreground">Pregled ormana</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<ViewModeToggle />
					{wardrobe.thumbnail && (
						<Button variant="outline" onClick={handleDownloadThumbnail}>
							<Download className="h-4 w-4 mr-2" />
							Slika
						</Button>
					)}
				</div>
			</div>

			{/* Info Cards */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="p-4">
					<div className="flex items-center gap-3">
						<User className="h-5 w-5 text-muted-foreground" />
						<div>
							<p className="text-sm text-muted-foreground">Vlasnik</p>
							<p className="font-medium">{wardrobe.userName || "Nepoznat"}</p>
							{wardrobe.userEmail && (
								<p className="text-xs text-muted-foreground">
									{wardrobe.userEmail}
								</p>
							)}
						</div>
					</div>
				</Card>

				<Card className="p-4">
					<div className="flex items-center gap-3">
						<Ruler className="h-5 w-5 text-muted-foreground" />
						<div>
							<p className="text-sm text-muted-foreground">Dimenzije</p>
							<p className="font-medium">
								{width} × {height} × {depth} cm
							</p>
						</div>
					</div>
				</Card>

				<Card className="p-4">
					<div className="flex items-center gap-3">
						<Calendar className="h-5 w-5 text-muted-foreground" />
						<div>
							<p className="text-sm text-muted-foreground">Kreiran</p>
							<p className="font-medium">
								{new Date(wardrobe.createdAt).toLocaleDateString("sr-RS", {
									year: "numeric",
									month: "short",
									day: "numeric",
								})}
							</p>
						</div>
					</div>
				</Card>

				<Card className="p-4">
					<div className="flex items-center gap-3">
						<Calendar className="h-5 w-5 text-muted-foreground" />
						<div>
							<p className="text-sm text-muted-foreground">Ažuriran</p>
							<p className="font-medium">
								{new Date(wardrobe.updatedAt).toLocaleDateString("sr-RS", {
									year: "numeric",
									month: "short",
									day: "numeric",
								})}
							</p>
						</div>
					</div>
				</Card>
			</div>

			{/* 3D Preview */}
			<Card className="overflow-hidden">
				<div className="h-[500px] sm:h-[600px]">
					<Scene wardrobeRef={wardrobeRef} />
				</div>
			</Card>
		</div>
	);
}
