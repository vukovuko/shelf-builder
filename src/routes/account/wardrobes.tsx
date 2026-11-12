import { createFileRoute } from "@tanstack/react-router";
import { WardrobesClient } from "@/components/account/WardrobesClient";
import WardrobesLoading from "@/components/account/WardrobesLoading";
import { myWardrobesQuery } from "@/server/account.functions";

export const Route = createFileRoute("/account/wardrobes")({
  // Not awaited: the list carries a preview image per design, so the page
  // shows its placeholders first and the list streams in.
  loader: ({ context }) => {
    if (context.user) context.queryClient.prefetchQuery(myWardrobesQuery);
  },
  pendingComponent: WardrobesLoading,
  component: WardrobesClient,
});
