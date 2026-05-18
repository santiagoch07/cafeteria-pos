# Cafetería POS — CLAUDE.md

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 3 |
| Base de datos | SQLite vía `better-sqlite3` |
| Runtime | Node.js (server components / API routes) |

## Estructura del proyecto

```
app/
  layout.tsx        — layout raíz (lang="es-MX")
  page.tsx          — página de inicio
  pos/page.tsx      — pantalla principal de caja
  api/              — API Routes (Next.js Route Handlers)
components/         — componentes React reutilizables
lib/
  db.ts             — singleton de SQLite + inicialización de esquema
  format.ts         — utilidades de formato de moneda
cafeteria.db        — base de datos SQLite (generada en runtime, ignorada en git)
```

## Precios en MXN

**Todos los precios se almacenan en centavos (entero)** en la base de datos para evitar errores de punto flotante.

Para formatear precios en la UI, usar **siempre**:

```ts
import { formatMXN } from "@/lib/format";

// Convierte centavos a string de moneda
formatMXN(1500); // → "$15.00"
```

Internamente usa:
```ts
new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" })
```

No usar `toLocaleString` ni formatear precios a mano. No almacenar precios como `float`.

## UI para tablet

La interfaz está diseñada para tabletas de ~10" usadas en caja:

- **Mínimo 60px de alto** en todos los botones interactivos (`min-h-[60px]` o clase `min-h-tap`)
- Fuentes grandes: mínimo `text-xl` para etiquetas de precio y acciones principales
- Sin tooltips, sin hover states como única fuente de información
- Targets táctiles amplios — preferir `p-4` o más en elementos interactivos
- No depender de hover; diseñar para touch-first

## Convenciones de código

- Los Server Components son la opción por defecto; marcar con `"use client"` solo cuando sea necesario
- Las operaciones de DB van en Server Components o Route Handlers, nunca en Client Components
- Importar con alias `@/` (ej: `@/lib/db`, `@/components/BotonProducto`)
