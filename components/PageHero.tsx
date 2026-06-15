type PageHeroProps = {
  eyebrow: string;
  title: string;
  lede: string;
};

export function PageHero({ eyebrow, title, lede }: PageHeroProps) {
  return (
    <header className="mb-6 sm:mb-8">
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-spark-muted">
        {eyebrow}
      </p>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="m-0 max-w-2xl text-sm text-muted-foreground sm:text-base">{lede}</p>
    </header>
  );
}
