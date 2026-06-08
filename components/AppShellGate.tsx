"use client";

import { usePathname } from "next/navigation";

import { AppShell } from "@/components/AppShell";

const AUTH_ROUTE_PREFIXES = ["/sign-in", "/sign-up"];

export function AppShellGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isAuthRoute) {
    return children;
  }

  return <AppShell>{children}</AppShell>;
}
