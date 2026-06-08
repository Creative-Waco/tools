type PageHeroProps = {
  eyebrow: string;
  title: string;
  lede: string;
};

export function PageHero({ eyebrow, title, lede }: PageHeroProps) {
  return (
    <header className="mb-8">
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {eyebrow}
      </p>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="m-0 max-w-2xl text-muted-foreground">{lede}</p>
    </header>
  );
}
