import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect('/');
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Account Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <p className="text-base">{session.user.name}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-base">{session.user.email}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Account Created</label>
            <p className="text-base">
              {session.user.createdAt ? formatDate(session.user.createdAt) : 'N/A'}
            </p>
          </div>

          {session.user.emailVerified !== undefined && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email Verified</label>
              <p className="text-base">
                {session.user.emailVerified ? '✓ Verified' : '✗ Not verified'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Link
          href="/wardrobes"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          ← Back to My Wardrobes
        </Link>
      </div>
    </div>
  );
}
