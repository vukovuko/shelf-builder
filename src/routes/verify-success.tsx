import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle } from "lucide-react";
import { useEffect, useTransition } from "react";
import { PendingContent } from "@/components/PendingContent";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/verify-success")({
  component: VerifySuccessPage,
});

const REDIRECT_AFTER_MS = 5000;

function VerifySuccessPage() {
  const navigate = useNavigate();
  const [isOpening, startOpening] = useTransition();

  useEffect(() => {
    const timeout = setTimeout(
      () => navigate({ to: "/design" }),
      REDIRECT_AFTER_MS,
    );
    return () => clearTimeout(timeout);
  }, [navigate]);

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
          <Button
            onClick={() =>
              startOpening(async () => {
                await navigate({ to: "/design" });
              })
            }
            className="w-full"
          >
            <PendingContent pending={isOpening}>
              Nastavi sa dizajnom
            </PendingContent>
          </Button>
          <p className="text-xs text-muted-foreground">
            Automatsko preusmeravanje za 5 sekundi...
          </p>
        </div>
      </Card>
    </div>
  );
}
