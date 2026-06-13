import { redirect } from "next/navigation";

type SearchInsightsRedirectPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchInsightsRedirectPage({
  searchParams,
}: SearchInsightsRedirectPageProps) {
  const params = await searchParams;
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (key === "section" || value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => next.append(key, item));
    } else {
      next.set(key, value);
    }
  }

  next.set("source", "search");
  const query = next.toString();
  redirect(query ? `/insights/?${query}` : "/insights/?source=search");
}
