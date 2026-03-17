import {
  Box,
  DoorOpen,
  Download,
  Layers,
  Save,
  SlidersHorizontal,
} from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Preko 30 materijala",
    description:
      "Premium materijali za korpus, front i poleđinu — od melaminskih ploča do furnira.",
  },
  {
    icon: SlidersHorizontal,
    title: "Tačno po meri",
    description:
      "Podesite dimenzije do centimetra, rasporedite police i fioke po kolonama.",
  },
  {
    icon: Box,
    title: "3D pregled u realnom vremenu",
    description:
      "Vidite orman iz svakog ugla dok ga dizajnirate — rotacija, zum, prikaz ivica.",
  },
  {
    icon: DoorOpen,
    title: "Vrata i dodaci",
    description:
      "Birajte tip vrata po pregradi — leva, desna, dvokrilna, klizna ili sa ogledalom.",
  },
  {
    icon: Save,
    title: "Sačuvajte dizajn",
    description:
      "Registrujte se i čuvajte više konfiguracija. Vratite se kad god želite.",
  },
  {
    icon: Download,
    title: "PDF specifikacija",
    description:
      "Preuzmite detaljan tehnički crtež sa svim dimenzijama i spiskom materijala.",
  },
];

export function Features() {
  return (
    <section className="py-8 lg:py-14">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-12">
          <p className="mb-4 font-bold text-3xl text-foreground lg:text-4xl">
            Šta sve možete?
          </p>
          <p className="max-w-2xl text-foreground/70 text-lg">
            Sve što vam treba za dizajn ormana — na jednom mestu.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`flex gap-4 rounded-2xl border border-border p-6 transition-colors hover:border-primary ${
                i < 2 ? "sm:col-span-1 lg:col-span-1" : ""
              }`}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-foreground/70 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
