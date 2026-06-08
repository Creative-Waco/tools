type PageHeroProps = {
  eyebrow: string;
  title: string;
  lede: string;
};

export function PageHero({ eyebrow, title, lede }: PageHeroProps) {
  return (
    <header className="mb-6">
      <p className="mb-2 text-xs uppercase tracking-widest text-muted">{eyebrow}</p>
      <h1 className="mb-2 text-[32px] leading-tight">{title}</h1>
      <p className="m-0 max-w-[60ch] leading-relaxed text-muted">{lede}</p>
    </header>
  );
}
