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
} from "@react-email/components";

interface OrderConfirmationEmailProps {
  orderId: string;
  customerName: string;
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
  success: "#86efac",
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

export default function OrderConfirmationEmail({
  orderId,
  customerName,
  totalPrice,
  shippingStreet,
  shippingCity,
  shippingPostalCode,
  baseUrl = getBaseUrl(),
}: OrderConfirmationEmailProps) {
  const orderIdShort = orderId.slice(0, 8).toUpperCase();

  return (
    <Html>
      <Head />
      <Preview>
        Vaša porudžbina #{orderIdShort} je primljena - Ormani po meri
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo/Brand Header */}
          <Section style={header}>
            <Img
              src={`${baseUrl}/ormani-po-meri-logo.webp`}
              width="120"
              height="120"
              alt="Ormani po meri"
              style={logoImage}
            />
          </Section>

          <Hr style={divider} />

          {/* Success Icon */}
          <Section style={successIconContainer}>
            <div style={successIcon}>✓</div>
          </Section>

          {/* Main Content */}
          <Heading style={h1}>Porudžbina primljena!</Heading>
          <Text style={text}>
            Poštovani {customerName}, hvala vam na porudžbini! Vaša porudžbina
            je uspešno primljena i uskoro ćemo vas kontaktirati radi potvrde.
          </Text>

          {/* Order Details */}
          <Section style={detailsBox}>
            <Text style={detailsTitle}>Detalji porudžbine</Text>

            <Row style={detailRow}>
              <Column style={detailLabel}>Broj porudžbine:</Column>
              <Column style={detailValue}>#{orderIdShort}</Column>
            </Row>

            <Row style={detailRow}>
              <Column style={detailLabel}>Ukupna cena:</Column>
              <Column style={detailValueHighlight}>
                {formatPrice(totalPrice)} RSD
              </Column>
            </Row>
          </Section>

          {/* Shipping Address */}
          <Section style={detailsBox}>
            <Text style={detailsTitle}>Adresa za dostavu</Text>
            <Text style={addressText}>{shippingStreet}</Text>
            <Text style={addressText}>
              {shippingPostalCode} {shippingCity}
            </Text>
          </Section>

          {/* Next Steps */}
          <Text style={textSmall}>
            Naš tim će pregledati vašu porudžbinu i kontaktirati vas u najkraćem
            roku sa dodatnim informacijama o proizvodnji i isporuci.
          </Text>

          <Hr style={divider} />

          {/* Footer */}
          <Text style={footer}>
            Ukoliko imate bilo kakvih pitanja, slobodno nas kontaktirajte.
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

const successIconContainer = {
  textAlign: "center" as const,
  margin: "16px 0",
};

const successIcon = {
  display: "inline-block",
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  backgroundColor: colors.success,
  color: colors.cardBg,
  fontSize: "28px",
  fontWeight: "bold",
  lineHeight: "48px",
  textAlign: "center" as const,
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
  margin: "16px 0",
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
  width: "50%",
};

const detailValue = {
  color: colors.text,
  fontSize: "14px",
  fontWeight: "500",
  textAlign: "right" as const,
  width: "50%",
};

const detailValueHighlight = {
  color: colors.primary,
  fontSize: "16px",
  fontWeight: "bold",
  textAlign: "right" as const,
  width: "50%",
};

const addressText = {
  color: colors.text,
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
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
