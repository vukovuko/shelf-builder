export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 md:p-24 text-center">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Platforma za dizajn ormana
        </h1>
        <p className="mt-6 text-base sm:text-lg leading-7 sm:leading-8 text-muted-foreground">
          Buducnost dizajna ormana po meri.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/design"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-white shadow hover:opacity-90 transition"
          >
            Pocni sa dizajnom
          </a>
        </div>
      </div>
    </main>
  );
}
