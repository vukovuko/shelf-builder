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

// Brand colors (converted from globals.css dark theme)
const colors = {
  primary: "#b794f6", // lab(73.7097% 25.5225 -35.515) - violet button
  accent: "#93c5fd", // --accent: oklch(0.8467 0.0833 210.2545) - light cyan
  background: "#252140", // --background: oklch(0.2155 0.0254 284.0647) - dark indigo
  cardBg: "#2d2952", // --card: oklch(0.2429 0.0304 283.911) - card background
  text: "#d8d4f0", // --foreground: oklch(0.8787 0.0426 272.2767) - light text
  textMuted: "#a8a4c4", // --muted-foreground: oklch(0.751 0.0396 273.932)
  border: "#3d3960", // --border: oklch(0.324 0.0319 281.9784)
};

export default function VerificationEmail({ url }: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verifikujte vašu email adresu - Ormani po meri</Preview>
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
            Hvala vam što ste kreirali nalog! Kliknite na dugme ispod da biste
            verifikovali vašu email adresu i aktivirali vaš nalog.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={url}>
              Verifikuj email
            </Button>
          </Section>

          <Text style={textSmall}>
            Ili kopirajte i nalepite ovaj link u vaš pregledač:
          </Text>
          <Link href={url} style={link}>
            {url}
          </Link>

          <Hr style={divider} />

          {/* Footer */}
          <Text style={footer}>
            Ako niste kreirali nalog na Ormani po meri, možete ignorisati ovaj
            email.
          </Text>
          <Text style={footerSmall}>
            © {new Date().getFullYear()} Ormani po meri. Sva prava zadržana.
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
  color: "#2d2952", // --primary-foreground: dark text on light primary
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
