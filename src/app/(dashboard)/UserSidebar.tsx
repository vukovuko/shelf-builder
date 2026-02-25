"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PenTool,
  FolderOpen,
  User,
  ShoppingBag,
  MessageSquare,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Dizajn",
    href: "/design",
    icon: PenTool,
  },
  {
    title: "Moji ormani",
    href: "/account/wardrobes",
    icon: FolderOpen,
  },
  {
    title: "Porudžbine",
    href: "/account/orders",
    icon: ShoppingBag,
  },
  {
    title: "Nalog",
    href: "/account/settings",
    icon: User,
  },
  {
    title: "Kontakt",
    href: "/account/contact",
    icon: MessageSquare,
  },
];

export function UserSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link
          href="/account/wardrobes"
          className="flex items-center gap-2"
          onClick={handleLinkClick}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">O</span>
          </div>
          <span className="font-semibold">Moj panel</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigacija</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/account/wardrobes" &&
                    pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.href} onClick={handleLinkClick}>
                        <item.icon className="mr-2" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
