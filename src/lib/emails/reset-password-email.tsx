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

interface ResetPasswordEmailProps {
	url: string;
	baseUrl?: string;
}

// Brand colors (same as verification email)
const colors = {
	primary: "#b794f6",
	accent: "#93c5fd",
	background: "#252140",
	cardBg: "#2d2952",
	text: "#d8d4f0",
	textMuted: "#a8a4c4",
	border: "#3d3960",
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

export default function ResetPasswordEmail({
	url,
	baseUrl = getBaseUrl(),
}: ResetPasswordEmailProps) {
	return (
		<Html>
			<Head />
			<Preview>Postavite vašu lozinku - Ormani po meri</Preview>
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

					{/* Main Content */}
					<Heading style={h1}>Postavite vašu lozinku</Heading>
					<Text style={text}>
						Kreiran vam je nalog na platformi Ormani po meri. Kliknite na dugme
						ispod da biste postavili vašu lozinku i aktivirali nalog.
					</Text>

					<Section style={buttonContainer}>
						<Button style={button} href={url}>
							Postavi lozinku
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
						Ako niste očekivali ovaj email, možete ga ignorisati.
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
	color: "#2d2952",
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
