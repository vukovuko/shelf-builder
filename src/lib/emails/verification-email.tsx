import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
  Section,
  Hr,
  Img,
} from "@react-email/components";

interface VerificationEmailProps {
  url: string;
}

// Brand colors (converted from oklch)
const colors = {
  primary: "#a855f7", // Purple - primary
  primaryDark: "#7c3aed", // Darker purple for button
  accent: "#38bdf8", // Cyan - accent
  background: "#1e1b4b", // Dark purple background
  cardBg: "#2e2a5e", // Slightly lighter card
  text: "#e2e8f0", // Light text
  textMuted: "#94a3b8", // Muted text
  border: "#3b3870", // Border color
};

export default function VerificationEmail({ url }: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verifikujte vasu email adresu - Ormani po meri</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo/Brand Header */}
          <Section style={header}>
            <Img
              src={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/ormani-po-meri-logo.webp`}
              width="120"
              height="120"
              alt="Ormani po meri"
              style={logoImage}
            />
          </Section>

          <Hr style={divider} />

          {/* Main Content */}
          <Heading style={h1}>Verifikacija email adrese</Heading>
          <Text style={text}>
            Hvala vam sto ste kreirali nalog! Kliknite na dugme ispod da biste
            verifikovali vasu email adresu i aktivirali vas nalog.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={url}>
              Verifikuj email
            </Button>
          </Section>

          <Text style={textSmall}>
            Ili kopirajte i nalepite ovaj link u vas pregledac:
          </Text>
          <Link href={url} style={link}>
            {url}
          </Link>

          <Hr style={divider} />

          {/* Footer */}
          <Text style={footer}>
            Ako niste kreirali nalog na Ormani po meri, mozete ignorisati ovaj
            email.
          </Text>
          <Text style={footerSmall}>
            © {new Date().getFullYear()} Ormani po meri. Sva prava zadrzana.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: colors.background,
  fontFamily:
    'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: colors.cardBg,
  margin: "40px auto",
  padding: "32px 40px",
  borderRadius: "8px",
  maxWidth: "480px",
  border: `1px solid ${colors.border}`,
};

const header = {
  textAlign: "center" as const,
  marginBottom: "8px",
};

const logoImage = {
  margin: "0 auto",
  display: "block",
};

const divider = {
  borderColor: colors.border,
  margin: "24px 0",
};

const h1 = {
  color: colors.text,
  fontSize: "22px",
  fontWeight: "bold",
  margin: "0 0 16px",
  padding: "0",
  textAlign: "center" as const,
};

const text = {
  color: colors.text,
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 20px",
  textAlign: "center" as const,
};

const textSmall = {
  color: colors.textMuted,
  fontSize: "13px",
  lineHeight: "20px",
  margin: "24px 0 8px",
  textAlign: "center" as const,
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "28px 0",
};

const button = {
  backgroundColor: colors.primary,
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
};

const link = {
  color: colors.accent,
  fontSize: "13px",
  wordBreak: "break-all" as const,
  textAlign: "center" as const,
  display: "block",
};

const footer = {
  color: colors.textMuted,
  fontSize: "13px",
  textAlign: "center" as const,
  margin: "0 0 8px",
};

const footerSmall = {
  color: colors.textMuted,
  fontSize: "11px",
  textAlign: "center" as const,
  margin: "0",
  opacity: 0.7,
};
