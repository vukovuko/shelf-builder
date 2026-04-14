import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Hr,
  Img,
  Row,
  Column,
  Link,
} from "@react-email/components";

interface InvoiceEmailProps {
  orderNumber: number;
  customerName: string;
  totalPrice: number;
  qrCid: string; // Content-ID for inline QR image (e.g. "ips-qr")
  receiverName: string;
  receiverAccountFormatted: string; // BBB-AAAAAAAAAAAAA-KK
  paymentCode: string;
  paymentPurpose: string;
  referenceNumber: string;
  baseUrl?: string;
}

const colors = {
  primary: "#b794f6",
  accent: "#93c5fd",
  background: "#252140",
  cardBg: "#2d2952",
  text: "#d8d4f0",
  textMuted: "#a8a4c4",
  border: "#3d3960",
  success: "#86efac",
};

const getBaseUrl = () => {
  try {
    if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
  } catch {
    // Ignore
  }
  return "https://ormanipomeri.com";
};

const formatPrice = (n: number) =>
  n.toLocaleString("sr-RS", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function InvoiceEmail({
  orderNumber,
  customerName,
  totalPrice,
  qrCid,
  receiverName,
  receiverAccountFormatted,
  paymentCode,
  paymentPurpose,
  referenceNumber,
  baseUrl = getBaseUrl(),
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {`Faktura za porudžbinu #${orderNumber} — ${formatPrice(totalPrice)} RSD`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={header}>
            <Img
              src={`${baseUrl}/ormani-po-meri-logo.webp`}
              width="100"
              height="100"
              alt="Ormani po meri"
              style={logoImage}
            />
          </Section>

          <Hr style={divider} />

          {/* Greeting */}
          <Heading style={h1}>Faktura</Heading>
          <Text style={text}>
            Poštovani {customerName}, u nastavku se nalaze podaci za uplatu vaše
            porudžbine #{orderNumber}.
          </Text>

          {/* Priznanica / Nalog za uplatu — simple text layout */}
          <Section style={priznanicaBox}>
            <Text style={priznanicaTitle}>NALOG ZA UPLATU</Text>

            <Row style={priznanicaRow}>
              <Column style={priznanicaLabel}>Primalac:</Column>
              <Column style={priznanicaValue}>
                {receiverName.replace(/\n/g, ", ")}
              </Column>
            </Row>

            <Row style={priznanicaRow}>
              <Column style={priznanicaLabel}>Svrha uplate:</Column>
              <Column style={priznanicaValue}>{paymentPurpose}</Column>
            </Row>

            <Row style={priznanicaRow}>
              <Column style={priznanicaLabel}>Šifra plaćanja:</Column>
              <Column style={priznanicaValue}>{paymentCode}</Column>
            </Row>

            <Row style={priznanicaRow}>
              <Column style={priznanicaLabel}>Valuta:</Column>
              <Column style={priznanicaValue}>RSD</Column>
            </Row>

            <Row style={priznanicaRow}>
              <Column style={priznanicaLabel}>Iznos:</Column>
              <Column style={priznanicaValueHighlight}>
                {formatPrice(totalPrice)} RSD
              </Column>
            </Row>

            <Row style={priznanicaRow}>
              <Column style={priznanicaLabel}>Račun primaoca:</Column>
              <Column style={priznanicaValue}>
                {receiverAccountFormatted}
              </Column>
            </Row>

            <Row style={priznanicaRow}>
              <Column style={priznanicaLabel}>Model i poziv na broj:</Column>
              <Column style={priznanicaValue}>{referenceNumber}</Column>
            </Row>
          </Section>

          {/* IPS QR Code — raw img tag because react-email <Img> strips cid: URLs */}
          <Section style={qrSection}>
            <img
              src={`cid:${qrCid}`}
              width={280}
              height={280}
              alt="IPS QR kod za uplatu"
              style={qrImage}
            />
            <Text style={qrLabel}>
              Skenirajte QR kod bankarskom aplikacijom za uplatu
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Text style={footer}>
            Ukoliko imate bilo kakvih pitanja, slobodno nas{" "}
            <Link href={`${baseUrl}/contact`} style={footerLink}>
              kontaktirajte
            </Link>
            .
          </Text>
          <Text style={footerSmall}>
            © {new Date().getFullYear()} Ormani po meri. Sva prava zadržana.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Sample data for react-email preview (npm run email:dev)
InvoiceEmail.PreviewProps = {
  orderNumber: 1026,
  customerName: "Vuko Vukašinović",
  totalPrice: 44020,
  qrCid: "ips-qr",
  receiverName: "SLAVISA BLESIC PR STILANO\nZUPANA PRIBILA 14\n11080 BEOGRAD",
  receiverAccountFormatted: "265-1100310092401-72",
  paymentCode: "289",
  paymentPurpose: "Porudzbina #1026",
  referenceNumber: "001026",
} as InvoiceEmailProps;

/* ── Styles ── */

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
  maxWidth: "520px",
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

const priznanicaBox = {
  backgroundColor: colors.background,
  borderRadius: "6px",
  padding: "20px",
  margin: "16px 0",
  border: `1px solid ${colors.border}`,
};

const priznanicaTitle = {
  color: colors.textMuted,
  fontSize: "14px",
  fontWeight: "700" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 18px",
  textAlign: "center" as const,
};

const priznanicaRow = {
  marginBottom: "12px",
};

const priznanicaLabel = {
  color: colors.textMuted,
  fontSize: "15px",
  width: "40%",
  verticalAlign: "top" as const,
};

const priznanicaValue = {
  color: colors.text,
  fontSize: "15px",
  fontWeight: "500" as const,
  width: "60%",
  textAlign: "right" as const,
};

const priznanicaValueHighlight = {
  color: colors.primary,
  fontSize: "18px",
  fontWeight: "bold" as const,
  width: "60%",
  textAlign: "right" as const,
};

const qrSection = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const qrImage = {
  margin: "0 auto",
  display: "block",
  borderRadius: "8px",
};

const qrLabel = {
  color: colors.text,
  fontSize: "15px",
  fontWeight: "500",
  margin: "16px 0 0",
  textAlign: "center" as const,
};

const footer = {
  color: colors.textMuted,
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "0 0 8px",
};

const footerLink = {
  color: colors.primary,
  textDecoration: "underline",
};

const footerSmall = {
  color: colors.textMuted,
  fontSize: "12px",
  textAlign: "center" as const,
  margin: "0",
  opacity: 0.7,
};
