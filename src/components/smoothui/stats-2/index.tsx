import { ClipboardCheck, Package, PencilRuler, Truck } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: PencilRuler,
    title: "Dizajnirajte",
    description:
      "Izaberite dimenzije, materijale, vrata i dodatke u 3D konfiguratoru.",
  },
  {
    number: "02",
    icon: ClipboardCheck,
    title: "Pregledajte",
    description:
      "Vidite realan 3D prikaz i preuzmite PDF specifikaciju sa svim detaljima.",
  },
  {
    number: "03",
    icon: Package,
    title: "Naručite",
    description:
      "Pošaljite dizajn i dobijte ponudu sa konačnom cenom i rokom isporuke.",
  },
  {
    number: "04",
    icon: Truck,
    title: "Isporuka",
    description:
      "Izrađujemo orman po vašoj specifikaciji i dostavljamo na adresu.",
  },
];

export function StatsCards() {
  return (
    <section className="py-8 lg:py-14">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-12">
          <p className="mb-4 font-bold text-3xl text-foreground lg:text-4xl">
            Kako funkcioniše?
          </p>
          <p className="max-w-2xl text-foreground/70 text-lg">
            Od ideje do gotovog ormana u četiri jednostavna koraka.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <span className="mb-4 block font-bold text-5xl text-primary/15">
                {step.number}
              </span>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <step.icon className="size-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">
                  {step.title}
                </h3>
              </div>
              <p className="text-foreground/70 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default StatsCards;
