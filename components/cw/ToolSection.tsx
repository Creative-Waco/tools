import { cn } from "@/lib/cn";

type ToolSectionProps = React.ComponentProps<"section"> & {
  title: string;
};

export function ToolSection({
  title,
  className,
  children,
  ...props
}: ToolSectionProps) {
  return (
    <section className={cn("mb-10 last:mb-0", className)} {...props}>
      <h2
        className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
