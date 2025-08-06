"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-md mx-auto">
        {/* Large 404 Number */}
        <div className="mb-8">
          <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
          <div className="w-24 h-1 bg-accent mx-auto rounded-full"></div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Page Not Found
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Sorry, we couldn't find the page you're looking for. The page may
            have been moved, deleted, or you entered the wrong URL.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Link href="/design">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 text-lg">
              Start Designing
            </Button>
          </Link>

          <div className="flex items-center justify-center space-x-4 text-sm">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Go Home
            </Link>
            <span className="text-border">•</span>
            <button
              onClick={() => window.history.back()}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>

        {/* Decorative Element */}
        <div className="mt-12 flex justify-center space-x-2">
          <div className="w-2 h-2 bg-accent rounded-full opacity-60"></div>
          <div className="w-2 h-2 bg-primary rounded-full opacity-80"></div>
          <div className="w-2 h-2 bg-accent rounded-full opacity-60"></div>
        </div>
      </div>
    </div>
  );
}
