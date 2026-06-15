"use client";

import { ChevronRight, ChevronsUpDown, LogOut, User } from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/cn";

type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  isActive?: boolean;
  children?: NavItem[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

type UserData = {
  name: string;
  email: string;
  avatar: string;
  onAccount?: () => void;
  onSignOut?: () => void;
};

type SidebarData = {
  logo: {
    src: string;
    alt: string;
    title: string;
    description: string;
  };
  navGroups: NavGroup[];
  footerGroup: NavGroup;
  user?: UserData;
};

type LinkComponentProps = React.ComponentPropsWithoutRef<"a"> & {
  href: string;
};

type LinkComponent = React.ComponentType<LinkComponentProps>;

function DefaultLink({
  href,
  children = null,
  className,
  ...props
}: LinkComponentProps) {
  return (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  );
}

function LogoMark({
  title,
  src,
  alt,
  className,
}: {
  title: string;
  src: string;
  alt: string;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("size-full object-contain", className)}
      />
    );
  }

  return (
    <span className={cn("text-xs font-semibold text-primary-foreground", className)}>
      {title
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()}
    </span>
  );
}

function MobileSidebarCloser() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  React.useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return null;
}

function useCloseMobileSidebarOnNavigate() {
  const { isMobile, setOpenMobile } = useSidebar();

  return React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);
}

const SidebarLogo = ({ logo }: { logo: SidebarData["logo"] }) => (
  <SidebarMenu className="min-w-0 flex-1 !w-auto">
    <SidebarMenuItem>
      <SidebarMenuButton
        size="lg"
        tooltip={logo.title}
        className="cursor-default hover:bg-transparent active:bg-transparent"
        render={<div role="presentation" />}
      >
        <div
          className={cn(
            "flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-sm",
            !logo.src && "bg-primary",
          )}
        >
          <LogoMark title={logo.title} src={logo.src} alt={logo.alt} />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 leading-none">
          <span className="truncate font-medium">{logo.title}</span>
          <span className="truncate text-xs text-muted-foreground">{logo.description}</span>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
);

const NavMenuItem = ({
  item,
  linkComponent: Link,
}: {
  item: NavItem;
  linkComponent: LinkComponent;
}) => {
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;
  const closeMobileSidebar = useCloseMobileSidebarOnNavigate();

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={item.isActive}
          tooltip={item.label}
          render={<Link href={item.href} onClick={closeMobileSidebar} />}
        >
          <Icon className="size-4" />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible defaultOpen className="group/collapsible" render={<SidebarMenuItem />}>
      <CollapsibleTrigger
        render={<SidebarMenuButton isActive={item.isActive} tooltip={item.label} />}
      >
        <Icon className="size-4" />
        <span>{item.label}</span>
        <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.children!.map((child) => (
            <SidebarMenuSubItem key={child.label}>
              <SidebarMenuSubButton
                isActive={child.isActive}
                render={<Link href={child.href} onClick={closeMobileSidebar} />}
              >
                {child.label}
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
};

const NavUser = ({ user }: { user: UserData }) => (
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            />
          }
        >
          <Avatar className="size-8 rounded-lg">
            {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
            <AvatarFallback className="rounded-lg">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          side="bottom"
          align="end"
          sideOffset={4}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
                  <AvatarFallback className="rounded-lg">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={user.onAccount}>
            <User className="mr-2 size-4" />
            Account
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={user.onSignOut}>
            <LogOut className="mr-2 size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
);

const AppSidebar = ({
  data,
  linkComponent,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  data: SidebarData;
  linkComponent: LinkComponent;
}) => (
  <Sidebar variant="inset" collapsible="icon" {...props}>
    <SidebarHeader>
      <div className="flex w-full items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-start">
        <SidebarLogo logo={data.logo} />
        <SidebarTrigger className="relative z-10 shrink-0 group-data-[collapsible=icon]:ml-0" />
      </div>
    </SidebarHeader>
    <SidebarContent className="overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        {data.navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavMenuItem
                    key={item.label}
                    item={item}
                    linkComponent={linkComponent}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </ScrollArea>
    </SidebarContent>
    {data.user ? (
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    ) : null}
    <SidebarRail />
  </Sidebar>
);

interface ApplicationShell2Props {
  className?: string;
  children?: React.ReactNode;
  data: SidebarData;
  linkComponent?: LinkComponent;
}

export function ApplicationShell2({
  className,
  children,
  data,
  linkComponent: LinkComponentProp = DefaultLink,
}: ApplicationShell2Props) {
  const Link = LinkComponentProp;

  return (
    <SidebarProvider className={cn("min-h-svh w-full", className)}>
      <MobileSidebarCloser />
      <AppSidebar data={data} linkComponent={Link} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={cn(
                "flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-sm",
                !data.logo.src && "bg-primary",
              )}
            >
              <LogoMark title={data.logo.title} src={data.logo.src} alt={data.logo.alt} />
            </div>
            <span className="truncate font-semibold">{data.logo.title}</span>
          </div>
        </header>
        <div className="flex min-w-0 flex-1 flex-col md:gap-4 md:p-6">
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden bg-card md:min-h-min md:rounded-panel md:border md:border-line md:shadow-panel">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export type { NavGroup, NavItem, SidebarData, UserData };
