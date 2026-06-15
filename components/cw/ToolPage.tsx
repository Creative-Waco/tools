import { cn } from "@/lib/cn";

type ToolPageProps = React.ComponentProps<"main"> & {
  wide?: boolean;
};

export function ToolPage({ wide = false, className, ...props }: ToolPageProps) {
  return (
    <main
      className={cn(
        "mx-auto w-full min-w-0 px-3 py-4 sm:px-4 md:px-6 md:py-8",
        wide ? "max-w-[1320px]" : "max-w-6xl",
        className,
      )}
      {...props}
    />
  );
}
