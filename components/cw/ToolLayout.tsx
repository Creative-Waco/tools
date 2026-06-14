import { cn } from "@/lib/cn";

type ToolLayoutProps = React.ComponentProps<"div">;

export function ToolLayout({ className, ...props }: ToolLayoutProps) {
  return (
    <div
      className={cn(
        "grid items-start gap-5",
        "grid-cols-1 md:grid-cols-[360px_1fr]",
        className,
      )}
      {...props}
    />
  );
}
