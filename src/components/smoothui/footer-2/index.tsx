"use client";

import { motion } from "motion/react";
import { SocialIcon, type SocialLink } from "@/components/SocialIcons";

const ANIMATION_DURATION = 0.6;
const DELAY_INCREMENT = 0.1;
const HOVER_SCALE = 1.1;
const TAP_SCALE = 0.9;
const DELAY_PRODUCT = DELAY_INCREMENT * 2;
const DELAY_COMPANY = DELAY_INCREMENT * 3;
const DELAY_SUPPORT = DELAY_INCREMENT * 4;
const DELAY_LEGAL = DELAY_INCREMENT * 5;
const DELAY_COPYRIGHT = DELAY_INCREMENT * 6;

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
      <div className="mx-auto max-w-7xl px-6 py-16">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 gap-12 lg:grid-cols-12"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: ANIMATION_DURATION }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          {/* Company Info & Newsletter */}
          <div className="lg:col-span-5">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 20 }}
              transition={{
                duration: ANIMATION_DURATION,
                delay: DELAY_INCREMENT,
              }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <h3 className="mb-4 font-bold text-2xl text-foreground">
                {companyName}
              </h3>
              <p className="mb-8 max-w-md text-foreground/70 text-sm leading-relaxed">
                {description}
              </p>

              {/* Social Links */}
              {social.length > 0 && (
                <div className="flex gap-4">
                  {social.map((item) => (
                    <motion.a
                      key={item.platform}
                      aria-label={item.label}
                      className="text-foreground/60 transition-colors hover:text-primary"
                      href={item.url}
                      rel="noopener noreferrer"
                      target="_blank"
                      whileHover={{ scale: HOVER_SCALE }}
                      whileTap={{ scale: TAP_SCALE }}
                    >
                      <SocialIcon platform={item.platform} />
                      <span className="sr-only">{item.label}</span>
                    </motion.a>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-7 lg:grid-cols-4">
            {links.product && links.product.length > 0 && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                transition={{
                  duration: ANIMATION_DURATION,
                  delay: DELAY_PRODUCT,
                }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <h4 className="mb-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                  Linkovi
                </h4>
                <ul className="space-y-3">
                  {links.product.map((link) => (
                    <li key={link.name}>
                      <a
                        className="text-foreground/70 text-sm transition-colors hover:text-primary"
                        href={link.url}
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {links.company && links.company.length > 0 && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                transition={{
                  duration: ANIMATION_DURATION,
                  delay: DELAY_COMPANY,
                }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <h4 className="mb-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                  Kompanija
                </h4>
                <ul className="space-y-3">
                  {links.company.map((link) => (
                    <li key={link.name}>
                      <a
                        className="text-foreground/70 text-sm transition-colors hover:text-primary"
                        href={link.url}
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {links.support && links.support.length > 0 && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                transition={{
                  duration: ANIMATION_DURATION,
                  delay: DELAY_SUPPORT,
                }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <h4 className="mb-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                  Podrška
                </h4>
                <ul className="space-y-3">
                  {links.support.map((link) => (
                    <li key={link.name}>
                      <a
                        className="text-foreground/70 text-sm transition-colors hover:text-primary"
                        href={link.url}
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {links.legal && links.legal.length > 0 && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                transition={{
                  duration: ANIMATION_DURATION,
                  delay: DELAY_LEGAL,
                }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <h4 className="mb-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                  Pravne informacije
                </h4>
                <ul className="space-y-3">
                  {links.legal.map((link) => (
                    <li key={link.name}>
                      <a
                        className="text-foreground/70 text-sm transition-colors hover:text-primary"
                        href={link.url}
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Copyright */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 border-border border-t pt-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{
            duration: ANIMATION_DURATION,
            delay: DELAY_COPYRIGHT,
          }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <p className="text-foreground/60 text-sm">{copyright}</p>
        </motion.div>
      </div>
    </footer>
  );
}

export default FooterComplex;
