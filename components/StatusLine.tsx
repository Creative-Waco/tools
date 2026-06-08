type StatusLineProps = {
  message: string;
  variant?: "" | "success" | "error";
};

export function StatusLine({ message, variant = "" }: StatusLineProps) {
  const className = [
    "status-line",
    variant === "success" ? "status-line--success" : "",
    variant === "error" ? "status-line--error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <p className={className} aria-live="polite">
      {message}
    </p>
  );
}
