import { cn } from "@/lib/cn";

type ToolPageProps = React.ComponentProps<"main"> & {
  wide?: boolean;
};

export function ToolPage({ wide = false, className, ...props }: ToolPageProps) {
  return (
    <main
      className={cn(
        "mx-auto w-full px-4 py-6 md:px-6 md:py-8",
        wide ? "max-w-[1320px]" : "max-w-6xl",
        className,
      )}
      {...props}
    />
  );
}
