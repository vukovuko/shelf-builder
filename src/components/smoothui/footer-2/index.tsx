import Link from "next/link";
import { SocialIcon, type SocialLink } from "@/components/SocialIcons";

interface FooterComplexProps {
  companyName?: string;
  description?: string;
  links?: {
    product?: Array<{ name: string; url: string }>;
    company?: Array<{ name: string; url: string }>;
    support?: Array<{ name: string; url: string }>;
    legal?: Array<{ name: string; url: string }>;
  };
  social?: SocialLink[];
  copyright?: string;
}

function FooterLink({ name, url }: { name: string; url: string }) {
  const isExternal = url.startsWith("http");
  if (isExternal) {
    return (
      <a
        className="inline-block py-1 text-foreground/70 text-sm transition-colors hover:text-primary focus-visible:text-primary"
        href={url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {name}
      </a>
    );
  }
  return (
    <Link
      className="inline-block py-1 text-foreground/70 text-sm transition-colors hover:text-primary focus-visible:text-primary"
      href={url}
    >
      {name}
    </Link>
  );
}

export function FooterComplex({
  companyName = "Ormani po meri",
  description = "Dizajnirajte savršen orman za vaš prostor. Konfigurator koji vam omogućava da birate dimenzije, materijale, vrata i dodatke — sve na jednom mestu.",
  links = {
    product: [
      { name: "Konfigurator", url: "/design" },
      { name: "Česta pitanja", url: "/faq" },
      { name: "Blog", url: "/blog" },
      { name: "Kontakt", url: "/contact" },
    ],
    company: [],
    support: [],
    legal: [
      { name: "Politika privatnosti", url: "/privacy" },
      { name: "Uslovi korišćenja", url: "/terms" },
    ],
  },
  social = [
    {
      platform: "facebook",
      label: "Facebook",
      url: "https://www.facebook.com/vuko.vukasinovic/",
    },
    {
      platform: "instagram",
      label: "Instagram",
      url: "https://www.instagram.com/vuko_vukasinovic/",
    },
    {
      platform: "linkedin",
      label: "LinkedIn",
      url: "https://www.linkedin.com/in/vuko-vukasinovic/",
    },
  ],
  copyright = `© ${new Date().getFullYear()} Ormani po meri. Sva prava zadržana.`,
}: FooterComplexProps) {
  return (
    <footer className="border-border border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Company Info */}
          <div className="lg:col-span-5">
            <div>
              <p className="mb-4 font-bold text-2xl text-foreground">
                {companyName}
              </p>
              <p className="mb-8 max-w-md text-foreground/70 text-sm leading-relaxed">
                {description}
              </p>

              {/* Social Links */}
              {social.length > 0 && (
                <div className="flex gap-4">
                  {social.map((item) => (
                    <a
                      key={item.platform}
                      aria-label={`${item.label} (otvara se u novom prozoru)`}
                      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-foreground/60 transition-colors hover:text-primary focus-visible:text-primary"
                      href={item.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <SocialIcon platform={item.platform} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-7 lg:grid-cols-3">
            {links.product && links.product.length > 0 && (
              <div>
                <p className="mb-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                  Linkovi
                </p>
                <ul className="space-y-1">
                  {links.product.map((link) => (
                    <li key={link.name}>
                      <FooterLink name={link.name} url={link.url} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {links.company && links.company.length > 0 && (
              <div>
                <p className="mb-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                  Kompanija
                </p>
                <ul className="space-y-1">
                  {links.company.map((link) => (
                    <li key={link.name}>
                      <FooterLink name={link.name} url={link.url} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {links.support && links.support.length > 0 && (
              <div>
                <p className="mb-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                  Podrška
                </p>
                <ul className="space-y-1">
                  {links.support.map((link) => (
                    <li key={link.name}>
                      <FooterLink name={link.name} url={link.url} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {links.legal && links.legal.length > 0 && (
              <div>
                <p className="mb-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                  Pravne informacije
                </p>
                <ul className="space-y-1">
                  {links.legal.map((link) => (
                    <li key={link.name}>
                      <FooterLink name={link.name} url={link.url} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 border-border border-t pt-8 text-center">
          <p className="text-foreground/60 text-sm">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}

export default FooterComplex;
