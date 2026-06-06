"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

const supabase = getSupabaseBrowser();

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wasRedirected = searchParams.get("redirect") === "1";
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      router.push("/pos");
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center">
          <p className="text-3xl font-semibold text-text-strong">
            Cafetería<span className="text-accent">.</span>
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-text-strong">Iniciar sesión</h1>
            <p className="text-sm text-muted">Bienvenido de vuelta</p>
          </div>

          {wasRedirected && !error && (
            <p className="text-sm text-muted bg-surface-2 rounded-lg px-4 py-3">
              Tu sesión expiró. Inicia sesión de nuevo.
            </p>
          )}

          {error && (
            <p className="text-sm text-error bg-error/10 rounded-lg px-4 py-3">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoFocus
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <Button
              type="submit"
              variant="primary"
              size="xl"
              className="w-full"
              disabled={loading}
            >
              {loading ? <Spinner size={18} /> : "Iniciar sesión"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="text-accent hover:underline font-medium">
            Crea una
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <LoginForm />
    </Suspense>
  );
}
