import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ContactClient } from "@/components/account/ContactClient";
import { accountContactQuery } from "@/server/account.functions";

export const Route = createFileRoute("/account/contact")({
  loader: ({ context }) =>
    context.user
      ? context.queryClient.ensureQueryData(accountContactQuery)
      : null,
  component: AccountContactPage,
});

function AccountContactPage() {
  const { data: contact } = useSuspenseQuery(accountContactQuery);
  return (
    contact && (
      <ContactClient
        wardrobes={contact.wardrobes}
        userName={contact.userName}
        userEmail={contact.userEmail}
      />
    )
  );
}
