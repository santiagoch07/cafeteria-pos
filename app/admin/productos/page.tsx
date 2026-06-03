"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, PackageX } from "lucide-react";
import { formatMXN } from "@/lib/format";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Spinner from "@/components/ui/Spinner";

type Categoria = { id: string; nombre: string };
type Producto = {
  id: string; nombre: string; precio: number; costo: number;
  categoria_id: string | null; categoria_nombre: string | null; disponible: boolean;
};

const EMPTY = { nombre: "", precio_pesos: "", costo_pesos: "0", categoria_id: "" as string, nueva_categoria: "", disponible: true };

function calcMargen(precio: number, costo: number): string {
  if (precio === 0) return "—";
  return ((precio - costo) / precio * 100).toFixed(1) + "%";
}

export default function AdminProductosPage() {
  const router = useRouter();
  const [productos, setProductos]   = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filtro, setFiltro]         = useState("Todos");
  const [modalOpen, setModalOpen]   = useState(false);
  const [editando, setEditando]     = useState<Producto | null>(null);
  const [form, setForm]             = useState({ ...EMPTY });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(true);

  const fetchData = useCallback(async () => {
    const [pr, cr] = await Promise.all([
      fetch("/api/productos", { cache: "no-store" }),
      fetch("/api/categorias", { cache: "no-store" }),
    ]);
    setProductos(await pr.json());
    setCategorias(await cr.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function abrirNuevo() {
    setEditando(null); setForm({ ...EMPTY }); setError(""); setModalOpen(true);
  }
  function abrirEditar(p: Producto) {
    setEditando(p);
    setForm({ nombre: p.nombre, precio_pesos: String(p.precio / 100), costo_pesos: String(p.costo / 100), categoria_id: p.categoria_id ?? "", nueva_categoria: "", disponible: p.disponible });
    setError(""); setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      let categoriaId: string | null = form.categoria_id || null;
      if (form.categoria_id === "nueva" && form.nueva_categoria.trim()) {
        const r = await fetch("/api/categorias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: form.nueva_categoria.trim() }) });
        if (!r.ok) throw new Error((await r.json()).error ?? "Error al crear categoría");
        categoriaId = (await r.json()).id;
      }
      const payload = { nombre: form.nombre, precio_pesos: parseFloat(form.precio_pesos as string), costo_pesos: parseFloat(form.costo_pesos) || 0, categoria_id: categoriaId, disponible: form.disponible };
      const res = await fetch(editando ? `/api/productos/${editando.id}` : "/api/productos", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al guardar");
      await fetchData();
      router.refresh();
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally { setSaving(false); }
  }

  async function toggleDisponible(p: Producto) {
    await fetch(`/api/productos/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disponible: !p.disponible }) });
    fetchData();
    router.refresh();
  }

  async function eliminar(p: Producto) {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/productos/${p.id}`, { method: "DELETE" });
    fetchData();
    router.refresh();
  }

  const categoriasFiltro = ["Todos", ...Array.from(new Set(productos.map((p) => p.categoria_nombre ?? "Sin categoría")))];
  const productosFiltrados = filtro === "Todos" ? productos : productos.filter((p) => (p.categoria_nombre ?? "Sin categoría") === filtro);

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-text-strong">Productos</h1>
            {!loading && <p className="text-sm text-muted mt-0.5">{productos.length} productos registrados</p>}
          </div>
          <Button variant="primary" size="md" onClick={abrirNuevo}>
            + Nuevo producto
          </Button>
        </div>

        {/* Pills de filtro */}
        {!loading && productos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {categoriasFiltro.map((cat) => (
              <button key={cat} onClick={() => setFiltro(cat)}>
                <Badge variant={filtro === cat ? "accent" : "default"}>{cat}</Badge>
              </button>
            ))}
          </div>
        )}

        {/* Estado de carga */}
        {loading && (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        )}

        {/* Empty state */}
        {!loading && productos.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20">
            <PackageX size={48} className="text-muted" />
            <p className="text-lg text-muted">Aún no tienes productos</p>
            <Button variant="primary" size="md" onClick={abrirNuevo}>Crear primer producto</Button>
          </div>
        )}

        {/* Tabla */}
        {!loading && productosFiltrados.length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs text-muted uppercase tracking-widest font-medium">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs text-muted uppercase tracking-widest font-medium">Categoría</th>
                  <th className="px-4 py-3 text-right text-xs text-muted uppercase tracking-widest font-medium">Precio</th>
                  <th className="px-4 py-3 text-right text-xs text-muted uppercase tracking-widest font-medium">Costo</th>
                  <th className="px-4 py-3 text-right text-xs text-muted uppercase tracking-widest font-medium">Margen</th>
                  <th className="px-4 py-3 text-center text-xs text-muted uppercase tracking-widest font-medium">Estado</th>
                  <th className="px-4 py-3 text-right text-xs text-muted uppercase tracking-widest font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 text-base font-medium text-text">{p.nombre}</td>
                    <td className="px-4 py-3">
                      {p.categoria_nombre
                        ? <Badge variant="default">{p.categoria_nombre}</Badge>
                        : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-base font-semibold text-text-strong">
                      {formatMXN(p.precio)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted">
                      {p.costo > 0 ? formatMXN(p.costo) : <span className="text-surface-2">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-muted">
                      {p.costo > 0 ? calcMargen(p.precio, p.costo) : <span className="text-surface-2">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleDisponible(p)}>
                        <Badge variant={p.disponible ? "success" : "default"}>
                          {p.disponible ? "Disponible" : "Agotado"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => abrirEditar(p)} className="text-muted hover:text-accent transition-colors" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => eliminar(p)} className="text-muted hover:text-error transition-colors" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editando ? "Editar producto" : "Nuevo producto"}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-error bg-error/10 rounded-lg px-4 py-2">{error}</p>}

          <Input
            label="Nombre *"
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
            placeholder="Ej. Café americano"
          />

          <Input
            label="Precio (pesos) *"
            type="number" step="0.01" min="0"
            value={form.precio_pesos}
            onChange={(e) => setForm({ ...form, precio_pesos: e.target.value })}
            required
            placeholder="Ej. 35.00"
          />

          <Input
            label="Costo del producto (pesos)"
            type="number" step="0.01" min="0"
            value={form.costo_pesos}
            onChange={(e) => setForm({ ...form, costo_pesos: e.target.value })}
            placeholder="Ej. 15.00"
          />

          {parseFloat(form.precio_pesos) > 0 && (
            <p className="text-sm text-muted -mt-2">
              Margen estimado:{" "}
              <span className="font-semibold text-accent">
                {((parseFloat(form.precio_pesos) - (parseFloat(form.costo_pesos) || 0)) / parseFloat(form.precio_pesos) * 100).toFixed(1)}%
              </span>
            </p>
          )}

          <Select
            label="Categoría"
            value={form.categoria_id}
            onChange={(e) => setForm({ ...form, categoria_id: e.target.value, nueva_categoria: "" })}
          >
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
            <option value="nueva">+ Nueva categoría…</option>
          </Select>

          {form.categoria_id === "nueva" && (
            <Input
              label="Nombre de nueva categoría *"
              type="text"
              value={form.nueva_categoria}
              onChange={(e) => setForm({ ...form, nueva_categoria: e.target.value })}
              required autoFocus
              placeholder="Ej. Bebidas calientes"
            />
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm({ ...form, disponible: !form.disponible })}
              className={`w-10 h-6 rounded-full transition-colors relative ${form.disponible ? "bg-accent" : "bg-surface-2"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-black rounded-full transition-transform ${form.disponible ? "translate-x-5" : "translate-x-1"}`} />
            </div>
            <span className="text-sm font-medium text-muted">Disponible en caja</span>
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="lg" className="flex-1" disabled={saving}>
              {saving ? <Spinner size={16} /> : editando ? "Guardar cambios" : "Crear producto"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
