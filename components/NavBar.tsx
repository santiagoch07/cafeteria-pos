"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import UserMenu from "@/components/UserMenu";

type NavItem = { href: string; label: string; Icon?: LucideIcon };

const LINKS: NavItem[] = [
  { href: "/pos",              label: "Caja" },
  { href: "/admin/productos",  label: "Productos" },
  { href: "/corte",            label: "Corte" },
  { href: "/finanzas",         label: "Finanzas", Icon: TrendingUp },
];

function NavLink({ href, label, active, Icon, onClick }: { href: string; label: string; active: boolean; Icon?: LucideIcon; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 text-sm transition-colors duration-150 px-1 pb-0.5 ${
        active
          ? "text-text-strong font-medium"
          : "text-muted hover:text-text"
      }`}
    >
      {Icon && <Icon size={14} />}
      {label}
      {active && (
        <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-accent rounded-full" />
      )}
    </Link>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function isActive(href: string) {
    return href === "/pos" ? pathname === "/pos" : pathname.startsWith(href);
  }

  return (
    <>
      <nav className="h-12 bg-bg border-b border-border flex items-center px-4 sm:px-6 gap-6 shrink-0 sticky top-0 z-40">
        {/* Logo */}
        <Link href="/" className="text-xl font-semibold text-text-strong shrink-0">
          Cafetería<span className="text-accent">.</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-6 h-full">
          {LINKS.map(({ href, label, Icon }) => (
            <NavLink key={href} href={href} label={label} active={isActive(href)} Icon={Icon} />
          ))}
        </div>

        {/* Right side: user menu + mobile hamburger */}
        <div className="ml-auto flex items-center gap-3">
          <UserMenu />
          <button
            className="sm:hidden text-muted hover:text-text transition-colors"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-64 bg-surface border-l border-border flex flex-col">
            <div className="flex items-center justify-between px-5 h-14 border-b border-border">
              <span className="text-base font-semibold text-text-strong">
                Cafetería<span className="text-accent">.</span>
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-muted hover:text-text transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-1 p-3">
              {LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDrawerOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(href)
                      ? "bg-accent text-black"
                      : "text-muted hover:text-text hover:bg-surface-2"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
