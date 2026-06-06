"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Building2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type UsuarioActual = {
  id: string;
  email: string;
  nombre: string;
  empresa_id: string;
  empresa: { id: string; nombre: string } | null;
};

export default function UserMenu() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioActual | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setUsuario)
      .catch(() => null);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleLogout() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!usuario) return null;

  const initial = usuario.nombre?.trim().charAt(0).toUpperCase() ?? "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menú de usuario"
        className="w-8 h-8 rounded-full bg-surface-2 border border-border hover:border-border-hi flex items-center justify-center text-sm font-semibold text-text-strong transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-60 bg-surface border border-border rounded-xl z-50 overflow-hidden">
          {/* Info del usuario */}
          <div className="px-4 py-3 border-b border-border space-y-0.5">
            <p className="text-sm font-semibold text-text-strong truncate">
              {usuario.nombre}
            </p>
            <p className="text-xs text-muted truncate">{usuario.email}</p>
            {usuario.empresa && (
              <div className="flex items-center gap-1.5 pt-1">
                <Building2 size={11} className="text-muted shrink-0" />
                <p className="text-xs text-muted truncate">
                  {usuario.empresa.nombre}
                </p>
              </div>
            )}
            {!usuario.empresa && (
              <p className="text-xs text-error mt-1">Sin empresa asignada</p>
            )}
          </div>

          {/* Acciones */}
          <div className="p-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-surface-2 rounded-lg transition-colors duration-150"
            >
              <LogOut size={14} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
