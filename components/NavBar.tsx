"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/pos", label: "Caja" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/corte", label: "Corte del día" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="h-12 bg-gray-900 text-white flex items-center px-4 gap-1 shrink-0">
      <span className="font-bold text-amber-400 mr-4 text-sm tracking-wide">☕ Cafetería</span>
      {LINKS.map(({ href, label }) => {
        const active =
          href === "/pos"
            ? pathname === "/pos"
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-amber-500 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
