import Link from "next/link";
import Button from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="w-full max-w-2xl space-y-10">
        {/* Logo */}
        <p className="text-xl font-semibold text-text-strong">
          Cafetería<span className="text-accent">.</span>
        </p>

        {/* Hero */}
        <div className="border-l-4 border-accent pl-6 space-y-4">
          <h1 className="text-6xl font-semibold text-text-strong leading-[1.05] text-balance">
            Tu cafetería,<br />en orden.
          </h1>
          <p className="text-lg text-muted max-w-md text-balance">
            Punto de venta y control financiero para negocios que les gusta saber cómo van.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/pos">
            <Button variant="primary" size="xl">
              Abrir caja
            </Button>
          </Link>
          <Link href="/corte">
            <Button variant="ghost" size="lg">
              Ver corte del día
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
