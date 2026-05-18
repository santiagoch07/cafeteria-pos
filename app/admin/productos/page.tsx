"use client";

import { useEffect, useState, useCallback } from "react";
import { formatMXN } from "@/lib/format";

type Categoria = { id: number; nombre: string; orden: number };
type Producto = {
  id: number;
  nombre: string;
  precio: number;
  categoria_id: number | null;
  categoria_nombre: string | null;
  disponible: number;
};

const EMPTY_FORM = {
  nombre: "",
  precio_pesos: "",
  categoria_id: "" as string | number,
  nueva_categoria: "",
  disponible: true,
};

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    const [prodRes, catRes] = await Promise.all([
      fetch("/api/productos"),
      fetch("/api/categorias"),
    ]);
    setProductos(await prodRes.json());
    setCategorias(await catRes.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function abrirNuevo() {
    setEditando(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setModalOpen(true);
  }

  function abrirEditar(p: Producto) {
    setEditando(p);
    setForm({
      nombre: p.nombre,
      precio_pesos: String(p.precio / 100),
      categoria_id: p.categoria_id ?? "",
      nueva_categoria: "",
      disponible: p.disponible === 1,
    });
    setError("");
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
    setEditando(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      let categoriaId: number | null = form.categoria_id ? Number(form.categoria_id) : null;

      // Crear nueva categoría si se ingresó texto
      if (form.categoria_id === "nueva" && form.nueva_categoria.trim()) {
        const catRes = await fetch("/api/categorias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: form.nueva_categoria.trim() }),
        });
        if (!catRes.ok) {
          const d = await catRes.json();
          throw new Error(d.error ?? "Error al crear categoría");
        }
        const cat: Categoria = await catRes.json();
        categoriaId = cat.id;
      }

      const payload = {
        nombre: form.nombre,
        precio_pesos: parseFloat(form.precio_pesos as string),
        categoria_id: categoriaId,
        disponible: form.disponible,
      };

      const url = editando ? `/api/productos/${editando.id}` : "/api/productos";
      const method = editando ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error al guardar");
      }

      await fetchData();
      cerrarModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDisponible(p: Producto) {
    await fetch(`/api/productos/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disponible: p.disponible === 0 }),
    });
    fetchData();
  }

  async function eliminar(p: Producto) {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/productos/${p.id}`, { method: "DELETE" });
    fetchData();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
          <p className="text-sm text-gray-500">{productos.length} productos registrados</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 rounded-xl min-h-[60px] transition-colors"
        >
          + Nuevo producto
        </button>
      </header>

      {/* Tabla */}
      <main className="p-6">
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100 text-gray-600 text-sm uppercase">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3 text-center">Disponible</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    Sin productos. ¡Agrega el primero!
                  </td>
                </tr>
              )}
              {productos.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{p.categoria_nombre ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{formatMXN(p.precio)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleDisponible(p)}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        p.disponible ? "bg-green-500" : "bg-gray-300"
                      }`}
                      title={p.disponible ? "Disponible — clic para desactivar" : "No disponible — clic para activar"}
                    >
                      <span
                        className={`block w-5 h-5 bg-white rounded-full shadow mx-1 transition-transform ${
                          p.disponible ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => abrirEditar(p)}
                      className="text-blue-600 hover:underline text-sm font-medium min-h-[60px] px-2"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminar(p)}
                      className="text-red-500 hover:underline text-sm font-medium min-h-[60px] px-2"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {editando ? "Editar producto" : "Nuevo producto"}
              </h2>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none min-h-[60px] px-2"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <p className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2">{error}</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Ej. Café americano"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio (pesos) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.precio_pesos}
                  onChange={(e) => setForm({ ...form, precio_pesos: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Ej. 35.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={form.categoria_id}
                  onChange={(e) => setForm({ ...form, categoria_id: e.target.value, nueva_categoria: "" })}
                  className="w-full border rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                  <option value="nueva">+ Nueva categoría…</option>
                </select>
              </div>

              {form.categoria_id === "nueva" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de nueva categoría <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nueva_categoria}
                    onChange={(e) => setForm({ ...form, nueva_categoria: e.target.value })}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Ej. Bebidas calientes"
                    autoFocus
                  />
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.disponible}
                  onChange={(e) => setForm({ ...form, disponible: e.target.checked })}
                  className="w-5 h-5 rounded accent-amber-500"
                />
                <span className="text-sm font-medium text-gray-700">Disponible en caja</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold rounded-xl min-h-[60px] hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl min-h-[60px] transition-colors"
                >
                  {saving ? "Guardando…" : editando ? "Guardar cambios" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
