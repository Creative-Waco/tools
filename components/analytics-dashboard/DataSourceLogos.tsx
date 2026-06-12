import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

const LOGOS = {
  ga4: {
    src: "/logos/ga4.png",
    alt: "Google Analytics 4",
  },
  gsc: {
    src: "/logos/gsc.png",
    alt: "Google Search Console",
  },
} as const;

type DataSource = keyof typeof LOGOS;

type DataSourceLogoProps = {
  source: DataSource;
  size?: number;
  className?: string;
};

export function DataSourceLogo({
  source,
  size = 16,
  className,
}: DataSourceLogoProps) {
  const logo = LOGOS[source];

  return (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    />
  );
}

export function Ga4Logo(props: Omit<DataSourceLogoProps, "source">) {
  return <DataSourceLogo source="ga4" {...props} />;
}

export function GscLogo(props: Omit<DataSourceLogoProps, "source">) {
  return <DataSourceLogo source="gsc" {...props} />;
}

type DataSourceTitleProps = {
  source: DataSource;
  children: ReactNode;
  className?: string;
};

export function DataSourceTitle({
  source,
  children,
  className,
}: DataSourceTitleProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <DataSourceLogo source={source} size={18} />
      {children}
    </span>
  );
}
