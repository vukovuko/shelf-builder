import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

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
      <div className="py-8 lg:py-14">
        <div className="container mx-auto w-full max-w-5xl px-6">
          <div className="mb-12">
            <p className="font-semibold text-2xl text-foreground md:text-3xl lg:text-4xl">
              Utisci korisnika
            </p>
            <p className="my-4 max-w-2xl text-balance text-lg text-muted-foreground">
              Pogledajte šta naši korisnici kažu o konfiguratoru. Stvarna
              iskustva ljudi koji su dizajnirali orman po meri.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {testimonials.map((testimonial) => (
              <div
                className="group rounded-2xl border border-transparent px-4 py-3 duration-200 hover:border-border hover:bg-background/50"
                key={testimonial.name}
              >
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={`${testimonial.name}-star-${i}`}
                      className={cn(
                        "size-4",
                        i < testimonial.stars
                          ? "fill-primary stroke-primary"
                          : "fill-muted stroke-border",
                      )}
                    />
                  ))}
                </div>
                <p className="my-4 text-foreground">{testimonial.content}</p>
                <div className="flex items-center gap-2">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default TestimonialsStars;
