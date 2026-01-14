import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Button,
  Section,
  Hr,
  Img,
  Row,
  Column,
} from "@react-email/components";

interface AdminNewOrderEmailProps {
  orderId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  totalPrice: number;
  shippingStreet: string;
  shippingCity: string;
  shippingPostalCode: string;
  baseUrl?: string;
}

// Brand colors (converted from globals.css dark theme)
const colors = {
  primary: "#b794f6",
  accent: "#93c5fd",
  background: "#252140",
  cardBg: "#2d2952",
  text: "#d8d4f0",
  textMuted: "#a8a4c4",
  border: "#3d3960",
  warning: "#fbbf24",
};

const getBaseUrl = () => {
  try {
    if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
  } catch {
    // Ignore - process not available in preview
  }
  return "https://ormanipomeri.com";
};

const formatPrice = (n: number) =>
  n.toLocaleString("sr-RS", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function AdminNewOrderEmail({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  totalPrice,
  shippingStreet,
  shippingCity,
  shippingPostalCode,
  baseUrl = getBaseUrl(),
}: AdminNewOrderEmailProps) {
  const orderIdShort = orderId.slice(0, 8).toUpperCase();
  const orderUrl = `${baseUrl}/admin/orders/${orderId}`;

  return (
    <Html>
      <Head />
      <Preview>
        Nova porudžbina #{orderIdShort} - {formatPrice(totalPrice)} RSD
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo/Brand Header */}
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

          {/* Alert Badge */}
          <Section style={badgeContainer}>
            <span style={badge}>NOVA PORUDŽBINA</span>
          </Section>

          {/* Main Content */}
          <Heading style={h1}>Porudžbina #{orderIdShort}</Heading>
          <Text style={priceHighlight}>{formatPrice(totalPrice)} RSD</Text>

          {/* Customer Info */}
          <Section style={detailsBox}>
            <Text style={detailsTitle}>Kupac</Text>

            <Row style={detailRow}>
              <Column style={detailLabel}>Ime:</Column>
              <Column style={detailValue}>{customerName}</Column>
            </Row>

            {customerEmail && (
              <Row style={detailRow}>
                <Column style={detailLabel}>Email:</Column>
                <Column style={detailValue}>{customerEmail}</Column>
              </Row>
            )}

            {customerPhone && (
              <Row style={detailRow}>
                <Column style={detailLabel}>Telefon:</Column>
                <Column style={detailValue}>{customerPhone}</Column>
              </Row>
            )}
          </Section>

          {/* Shipping Address */}
          <Section style={detailsBox}>
            <Text style={detailsTitle}>Adresa za dostavu</Text>
            <Text style={addressText}>{shippingStreet}</Text>
            <Text style={addressText}>
              {shippingPostalCode} {shippingCity}
            </Text>
          </Section>

          {/* CTA Button */}
          <Section style={buttonContainer}>
            <Button style={button} href={orderUrl}>
              Pregledaj porudžbinu
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Text style={footer}>
            Ovo je automatska notifikacija za nove porudžbine.
          </Text>
          <Text style={footerSmall}>
            © {new Date().getFullYear()} Ormani po meri - Admin Panel
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

const badgeContainer = {
  textAlign: "center" as const,
  margin: "8px 0 16px",
};

const badge = {
  display: "inline-block",
  backgroundColor: colors.warning,
  color: colors.cardBg,
  fontSize: "11px",
  fontWeight: "bold",
  padding: "6px 12px",
  borderRadius: "4px",
  letterSpacing: "0.5px",
};

const divider = {
  borderColor: colors.border,
  margin: "24px 0",
};

const h1 = {
  color: colors.text,
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0 0 8px",
  padding: "0",
  textAlign: "center" as const,
};

const priceHighlight = {
  color: colors.primary,
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const detailsBox = {
  backgroundColor: colors.background,
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "16px 0",
  border: `1px solid ${colors.border}`,
};

const detailsTitle = {
  color: colors.textMuted,
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px",
};

const detailRow = {
  marginBottom: "8px",
};

const detailLabel = {
  color: colors.textMuted,
  fontSize: "14px",
  width: "35%",
};

const detailValue = {
  color: colors.text,
  fontSize: "14px",
  fontWeight: "500",
  width: "65%",
};

const addressText = {
  color: colors.text,
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "28px 0",
};

const button = {
  backgroundColor: colors.primary,
  borderRadius: "6px",
  color: "#2d2952",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
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
