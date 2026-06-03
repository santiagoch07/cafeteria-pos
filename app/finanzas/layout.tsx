"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/finanzas", label: "Dashboard", exact: true },
  { href: "/finanzas/gastos", label: "Gastos", exact: false },
];

export default function FinanzasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="h-full flex flex-col">
      {/* Sub-nav */}
      <div className="border-b border-border px-4 sm:px-6 flex gap-0 shrink-0 bg-bg">
        {TABS.map(({ href, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`px-5 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
                active
                  ? "border-accent text-text-strong font-medium"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
      {/* Contenido */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
