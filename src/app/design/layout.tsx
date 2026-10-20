import type { Metadata } from "next";
import { DesignerShell } from "./DesignerShell";

export const metadata: Metadata = {
  title: "3D Konfigurator Ormana | Dizajnirajte Ormar po Meri Online",
  description:
    "Besplatan 3D konfigurator za ormare po meri. Birajte dimenzije, materijale, police, fioke i vrata. Vizualizujte orman uživo i preuzmite PDF specifikaciju.",
};

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DesignerShell mode="basic">{children}</DesignerShell>;
}
