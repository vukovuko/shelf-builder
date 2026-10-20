import type { Metadata } from "next";
import { DesignerShell } from "../design/DesignerShell";

// The full configurator the team works on; /design is the public, reduced one.
export const metadata: Metadata = {
  title: "Konfigurator (test)",
  robots: { index: false, follow: false },
};

export default function DesignTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DesignerShell mode="full">{children}</DesignerShell>;
}
