"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function VerifySuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to design after 5 seconds
    const timeout = setTimeout(() => {
      router.push("/design");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Email verifikovan!</h1>
          <p className="text-muted-foreground">
            Vaša email adresa je uspešno verifikovana. Možete nastaviti sa
            dizajniranjem vašeg ormana.
          </p>
        </div>
        <div className="space-y-3">
          <Button onClick={() => router.push("/design")} className="w-full">
            Nastavi sa dizajnom
          </Button>
          <p className="text-xs text-muted-foreground">
            Automatsko preusmeravanje za 5 sekundi...
          </p>
        </div>
      </Card>
    </div>
  );
}
