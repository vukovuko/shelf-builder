"use client";

import { MoreVertical, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/auth-client";

interface Wardrobe {
  id: string;
  name: string;
  thumbnail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Simple relative time formatter
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
  if (diffDay < 30)
    return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) !== 1 ? "s" : ""} ago`;
  return new Date(date).toLocaleDateString();
}

export default function WardrobesPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [wardrobes, setWardrobes] = useState<Wardrobe[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect to home if not logged in
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [session, isPending, router]);

  // Fetch wardrobes
  async function fetchWardrobes() {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch("/api/wardrobes");
      if (res.ok) {
        const data = await res.json();
        setWardrobes(data);
      } else {
        toast.error("Failed to load wardrobes");
      }
    } catch (error) {
      console.error("Failed to fetch wardrobes:", error);
      toast.error("Failed to load wardrobes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWardrobes();
  }, [fetchWardrobes]);

  // Handle load wardrobe
  function handleLoad(id: string) {
    router.push(`/design?load=${id}`);
  }

  // Handle duplicate wardrobe
  async function handleDuplicate(id: string) {
    const original = wardrobes.find((w) => w.id === id);
    if (!original) return;

    try {
      // Fetch full wardrobe data first
      const res = await fetch(`/api/wardrobes/${id}`);
      if (!res.ok) {
        toast.error("Failed to load wardrobe");
        return;
      }
      const fullWardrobe = await res.json();

      // Create duplicate
      const duplicateRes = await fetch("/api/wardrobes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${original.name} (Copy)`,
          data: fullWardrobe.data,
          thumbnail: original.thumbnail,
        }),
      });

      if (duplicateRes.ok) {
        toast.success("Wardrobe duplicated!");
        await fetchWardrobes();
      } else {
        toast.error("Failed to duplicate wardrobe");
      }
    } catch (error) {
      console.error("Failed to duplicate:", error);
      toast.error("Failed to duplicate wardrobe");
    }
  }

  // Handle share wardrobe
  async function handleShare(id: string) {
    const shareUrl = `${window.location.origin}/design?load=${id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy link");
    }
  }

  // Handle delete wardrobe
  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this wardrobe?")) return;

    try {
      const res = await fetch(`/api/wardrobes/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Wardrobe deleted");
        await fetchWardrobes();
      } else {
        toast.error("Failed to delete wardrobe");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete wardrobe");
    }
  }

  // Don't render until we know auth status
  if (isPending || !session) {
    return (
      <div className="container max-w-7xl mx-auto py-10">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Wardrobes</h1>
          <p className="text-muted-foreground mt-1">
            Manage your saved wardrobe designs
          </p>
        </div>
        <Link href="/design">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Wardrobe
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">
          Loading wardrobes...
        </div>
      ) : wardrobes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No saved wardrobes yet</p>
          <Link href="/design">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create your first wardrobe design
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wardrobes.map((wardrobe) => (
            <Card
              key={wardrobe.id}
              className="group relative overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video bg-muted relative">
                {wardrobe.thumbnail ? (
                  <img
                    src={wardrobe.thumbnail}
                    alt={wardrobe.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No preview
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Button
                    onClick={() => handleLoad(wardrobe.id)}
                    variant="secondary"
                  >
                    Load
                  </Button>
                </div>
              </div>

              <CardHeader className="flex flex-row items-start justify-between p-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">
                    {wardrobe.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {formatRelativeTime(wardrobe.updatedAt)}
                  </CardDescription>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-accent rounded transition">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleLoad(wardrobe.id)}>
                      Load
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDuplicate(wardrobe.id)}
                    >
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare(wardrobe.id)}>
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(wardrobe.id)}
                      className="text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
