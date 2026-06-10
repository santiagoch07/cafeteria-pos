"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import type { Rol } from "@/lib/types";

type Miembro = {
  id: string;
  email: string;
  nombre: string | null;
  rol: Rol;
  created_at: string;
};

export default function EquipoPage() {
  const [equipo, setEquipo]         = useState<Miembro[]>([]);
  const [miId, setMiId]             = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);

  // Form del modal
  const [nombre,   setNombre]   = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [formError, setFormError] = useState("");

  const cargar = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/equipo",   { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/me",       { cache: "no-store" }).then((r) => r.ok ? r.json() : null),
    ])
      .then(([miembros, me]) => {
        setEquipo(Array.isArray(miembros) ? miembros : []);
        setMiId(me?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirModal() {
    setNombre(""); setEmail(""); setPassword(""); setFormError("");
    setModalOpen(true);
  }

  async function crearCajero() {
    setFormError("");
    if (!email.trim()) { setFormError("El email es requerido"); return; }
    if (!password)     { setFormError("La contraseña es requerida"); return; }
    if (password.length < 6) { setFormError("La contraseña debe tener al menos 6 caracteres"); return; }

    setSaving(true);
    const res = await fetch("/api/equipo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), nombre: nombre.trim() || null, password }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setFormError(data.error ?? "Error al crear cajero"); return; }

    setEquipo((prev) => [
      ...prev,
      { id: data.usuario.id, email: data.usuario.email, nombre: data.usuario.nombre, rol: "cajero", created_at: new Date().toISOString() },
    ]);
    setModalOpen(false);
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/equipo/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEquipo((prev) => prev.filter((m) => m.id !== id));
    } else {
      const data = await res.json();
      alert(data.error ?? "No se pudo eliminar");
    }
  }

  const solamente = equipo.length === 1 && equipo[0]?.id === miId;

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5 pb-16">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-text-strong">Equipo</h1>
            <p className="text-sm text-muted mt-0.5">
              Gestiona quién tiene acceso a tu cafetería
            </p>
          </div>
          <Button variant="primary" size="md" onClick={abrirModal}>
            <Plus size={15} className="mr-1.5" />
            Invitar cajero
          </Button>
        </div>

        {/* Mensaje solo */}
        {!loading && solamente && (
          <div className="bg-surface-2 border-l-4 border-accent rounded-r-xl px-4 py-3">
            <p className="text-sm text-muted">
              Aún estás solo en tu equipo. Invita a tus cajeros para que puedan operar
              la caja sin acceso a tus números financieros.
            </p>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <div className="space-y-3">
            {equipo.map((m) => {
              const esSelf = m.id === miId;
              const inicial = (m.nombre ?? m.email).trim().charAt(0).toUpperCase();
              const displayName = m.nombre ?? m.email;

              return (
                <div
                  key={m.id}
                  className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-black">{inicial}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text truncate">{displayName}</span>
                      <Badge variant={m.rol === "dueno" ? "accent" : "default"}>
                        {m.rol === "dueno" ? "Dueño" : "Cajero"}
                      </Badge>
                      {esSelf && (
                        <Badge variant="default" className="text-muted">Tú</Badge>
                      )}
                    </div>
                    {m.nombre && (
                      <p className="text-xs text-muted mt-0.5 truncate">{m.email}</p>
                    )}
                  </div>

                  {/* Eliminar */}
                  {!esSelf && (
                    <button
                      onClick={() => eliminar(m.id)}
                      className="text-muted hover:text-error transition-colors p-1.5 rounded-lg hover:bg-surface-2 shrink-0"
                      title="Eliminar usuario"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal invitar cajero */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Invitar cajero" maxWidth="sm">
        <div className="p-6 space-y-4">
          <Input
            label="Nombre (opcional)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Juan García"
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cajero@tucafe.com"
          />
          <Input
            label="Contraseña temporal"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
          <p className="text-xs text-muted">
            El cajero usará este email y contraseña para entrar a SQNAR.
            Puede cambiarla después.
          </p>
          {formError && (
            <p className="text-xs text-error bg-error/10 rounded-lg px-3 py-2">{formError}</p>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={crearCajero} disabled={saving}>
              {saving ? <Spinner size={14} /> : "Crear cajero"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
