import { breakdownUrl } from "@/lib/utm-builder/build-url";

const KIND_CLASS: Record<
  ReturnType<typeof breakdownUrl>[number]["kind"],
  string
> = {
  origin: "utm-breakdown-origin",
  path: "utm-breakdown-path",
  "query-start": "utm-breakdown-query",
  "param-key": "utm-breakdown-key",
  "param-value": "utm-breakdown-value",
  separator: "utm-breakdown-sep",
};

type UrlBreakdownProps = {
  url: string;
};

export function UrlBreakdown({ url }: UrlBreakdownProps) {
  const parts = breakdownUrl(url);
  if (parts.length === 0) return null;

  return (
    <p className="utm-breakdown" aria-label="URL breakdown">
      {parts.map((part, index) => (
        <span key={`${part.kind}-${index}`} className={KIND_CLASS[part.kind]}>
          {part.text}
        </span>
      ))}
    </p>
  );
}
