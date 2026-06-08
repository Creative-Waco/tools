"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import {
  BarChart3,
  ImageIcon,
  LayoutDashboard,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import {
  ApplicationShell2,
  type SidebarData,
} from "@/components/application-shell2";
import { TOOLS } from "@/lib/tools-registry";

function ShellLink({
  href,
  children = null,
  className,
}: {
  href: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

const TAG_ICONS = {
  Newsletter: Mail,
  Social: ImageIcon,
  Membership: BarChart3,
} as const;

function normalizePath(path: string) {
  if (path === "/") return "/";
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

function isActivePath(currentPath: string, href: string) {
  const current = normalizePath(currentPath);
  const target = normalizePath(href);

  if (target === "/") {
    return current === "/";
  }

  return current === target || current.startsWith(`${target}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const { openUserProfile, signOut } = useClerk();

  const sidebarData = useMemo<SidebarData>(() => {
    const displayName =
      user?.fullName ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      "Account";

    return {
      logo: {
        src: "/icon.png",
        alt: "Creative Waco",
        title: "Creative Waco",
        description: "Internal tools",
      },
      navGroups: [
        {
          title: "Tools",
          defaultOpen: true,
          items: [
            {
              label: "All tools",
              icon: LayoutDashboard,
              href: "/",
              isActive: isActivePath(pathname, "/"),
            },
            ...TOOLS.map((tool) => ({
              label: tool.name,
              icon: TAG_ICONS[tool.tag],
              href: tool.path,
              isActive: isActivePath(pathname, tool.path),
            })),
          ],
        },
      ],
      footerGroup: {
        title: "Support",
        items: [],
      },
      user: isLoaded && user
        ? {
            name: displayName,
            email: user.primaryEmailAddress?.emailAddress ?? "",
            avatar: user.imageUrl,
            onAccount: () => openUserProfile(),
            onSignOut: () => signOut({ redirectUrl: "/sign-in/" }),
          }
        : undefined,
    };
  }, [isLoaded, openUserProfile, pathname, signOut, user]);

  return (
    <ApplicationShell2 data={sidebarData} linkComponent={ShellLink}>
      {children}
    </ApplicationShell2>
  );
}
