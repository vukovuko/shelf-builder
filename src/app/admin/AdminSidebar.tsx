"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, ShoppingCart, FolderOpen, Package } from "lucide-react";
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
    title: "Pocetna",
    href: "/admin",
    icon: Home,
  },
  {
    title: "Korisnici",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Porudzbine",
    href: "/admin/orders",
    icon: ShoppingCart,
    disabled: true,
  },
  {
    title: "Ormani",
    href: "/admin/wardrobes",
    icon: FolderOpen,
  },
  {
    title: "Materijali",
    href: "/admin/materials",
    icon: Package,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2" onClick={handleLinkClick}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">A</span>
          </div>
          <span className="font-semibold">Admin</span>
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
                  (item.href !== "/admin" && pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      disabled={item.disabled}
                      tooltip={item.title}
                    >
                      {item.disabled ? (
                        <span className="opacity-50 cursor-not-allowed">
                          <item.icon className="mr-2" />
                          <span>{item.title}</span>
                        </span>
                      ) : (
                        <Link href={item.href} onClick={handleLinkClick}>
                          <item.icon className="mr-2" />
                          <span>{item.title}</span>
                        </Link>
                      )}
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
