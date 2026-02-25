"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { motion } from "motion/react";

interface Testimonial {
  name: string;
  role: string;
  content: string;
  stars: number;
}

const testimonials: Testimonial[] = [
  {
    name: "Marko J.",
    role: "Vlasnik stana",
    content:
      "Konfigurator je fantastičan! Za 10 minuta sam dizajnirao orman koji savršeno odgovara mom prostoru. 3D prikaz je veoma realan i pomogao mi je da donesem pravu odluku.",
    stars: 5,
  },
  {
    name: "Ana S.",
    role: "Dizajner enterijera",
    content:
      "Koristim ovaj alat za sve projekte sa klijentima. Mogućnost izbora materijala i automatski proračun cena značajno ubrzava ceo proces — od ideje do narudžbine.",
    stars: 5,
  },
  {
    name: "Nikola P.",
    role: "Vlasnik kuće",
    content:
      "Naručio sam dva ormana sa kliznim vratima i rezultat je izvanredan. PDF specifikacija je bila detaljna, a izrada tačno po meri. Preporučujem svima!",
    stars: 5,
  },
  {
    name: "Jelena M.",
    role: "Arhitekta",
    content:
      "Profesionalan alat sa odličnim izborom materijala. Posebno mi se dopada mogućnost podešavanja polica i fioka po kolonama — fleksibilnost koja nedostaje većini konfiguratora.",
    stars: 4,
  },
];

export function TestimonialsStars() {
  return (
    <section>
      <div className="py-10 lg:py-24">
        <div className="container mx-auto w-full max-w-5xl px-6">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="font-semibold text-4xl text-foreground">
              Utisci korisnika
            </h2>
            <p className="my-4 text-balance text-lg text-muted-foreground">
              Pogledajte šta naši korisnici kažu o konfiguratoru. Stvarna
              iskustva ljudi koji su dizajnirali orman po meri.
            </p>
          </motion.div>
          <motion.div
            animate={{ opacity: 1 }}
            className="grid gap-6 lg:grid-cols-2"
            initial={{ opacity: 0 }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.2,
            }}
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="group rounded-2xl border border-transparent px-4 py-3 duration-200 hover:border-border hover:bg-background/50"
                initial={{ opacity: 0, y: 30 }}
                key={testimonial.name}
                transition={{
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                  delay: index * 0.15,
                }}
                whileHover={{
                  y: -4,
                  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
                }}
              >
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex gap-1"
                  initial={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.15 + 0.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      animate={{ opacity: 1, scale: 1 }}
                      initial={{ opacity: 0, scale: 0 }}
                      key={`${testimonial.name}-star-${i}`}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.15 + 0.2 + i * 0.05,
                        ease: [0.68, -0.55, 0.265, 1.55],
                      }}
                    >
                      <Star
                        className={cn(
                          "size-4 transition-colors duration-200",
                          i < testimonial.stars
                            ? "fill-primary stroke-primary"
                            : "fill-muted stroke-border",
                        )}
                      />
                    </motion.div>
                  ))}
                </motion.div>
                <motion.p
                  animate={{ opacity: 1, y: 0 }}
                  className="my-4 text-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.15 + 0.4,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {testimonial.content}
                </motion.p>
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.15 + 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Avatar className="size-6 border border-transparent shadow ring-1 ring-foreground/10">
                    <AvatarFallback>
                      {testimonial.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="font-medium text-foreground text-sm">
                    {testimonial.name}
                  </div>
                  <span
                    aria-hidden="true"
                    className="size-1 rounded-full bg-foreground/25"
                  />
                  <span className="text-muted-foreground text-sm">
                    {testimonial.role}
                  </span>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default TestimonialsStars;
