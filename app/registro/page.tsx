"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import SqnarLogo from "@/components/SqnarLogo";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

const supabase = getSupabaseBrowser();

export default function RegistroPage() {
  const router = useRouter();
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [nombreDueno, setNombreDueno]     = useState("");
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [error, setError]                 = useState("");
  const [loading, setLoading]             = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    if (!authData.user) {
      setError("Error al crear usuario. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    // 2. Crear empresa + usuario en la BD via API
    const res = await fetch("/api/registro/empresa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: authData.user.id,
        email,
        nombre_dueno: nombreDueno,
        nombre_negocio: nombreNegocio,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? "Error al crear la empresa. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    router.push("/pos");
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex justify-center">
          <SqnarLogo size="lg" />
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-text-strong">Crear cuenta</h1>
            <p className="text-sm text-muted">Empieza gratis hoy</p>
          </div>

          {error && (
            <p className="text-sm text-error bg-error/10 rounded-lg px-4 py-3">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre de tu negocio *"
              type="text"
              value={nombreNegocio}
              onChange={(e) => setNombreNegocio(e.target.value)}
              placeholder="Ej. Café Roble"
              required
              autoFocus
            />
            <Input
              label="Tu nombre"
              type="text"
              value={nombreDueno}
              onChange={(e) => setNombreDueno(e.target.value)}
              placeholder="Ej. María González"
            />
            <Input
              label="Email *"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
            <Input
              label="Contraseña *"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
            <Button
              type="submit"
              variant="primary"
              size="xl"
              className="w-full"
              disabled={loading}
            >
              {loading ? <Spinner size={18} /> : "Crear cuenta"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-accent hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
