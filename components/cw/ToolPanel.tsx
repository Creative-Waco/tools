import { cn } from "@/lib/cn";

type ToolPanelProps = React.ComponentProps<"div">;

export function ToolPanel({ className, ...props }: ToolPanelProps) {
  return (
    <div
      className={cn(
        "rounded-panel border border-line bg-card p-5 shadow-panel",
        className,
      )}
      {...props}
    />
  );
}
