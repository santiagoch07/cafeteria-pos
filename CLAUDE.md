# SQNAR — Contexto del proyecto

## Visión del producto

SQNAR es una plataforma SaaS de QuackQuick para cafeterías y restaurantes pequeños en México. La metáfora: como un sonar le da visibilidad al submarino, SQNAR le da visibilidad financiera al dueño. Hoy la plataforma incluye un POS con módulo de Salud Financiera; el roadmap contempla agregar inventario, lealtad y facturación como productos adicionales bajo el mismo paraguas.

Mercado objetivo inicial: cafeterías y restaurantes pequeños en Monterrey, NL. Precio objetivo: $899-1,499 MXN/mes por sucursal.

Producto en desarrollo activo. Esquema de base de datos ya migrado a multi-tenant (campo `empresa_id` en todas las tablas). Auth con Supabase Auth ya implementada (Pasos 1–4). RLS se habilita en la siguiente fase.

## Stack tecnológico

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Base de datos**: Supabase Postgres (cliente en `lib/supabase.ts`)
- **Autenticación**: ninguna por ahora — Supabase Auth se activa junto con RLS en fase multi-tenant
- **Gráficas**: Recharts
- **Íconos**: lucide-react
- **Hosting**: Vercel (deploy automático desde GitHub main branch)
- **Repo**: github.com/santiagoch07/cafeteria-pos (público)
- **URL producción**: cafeteria-pos-kappa.vercel.app

## Convenciones críticas del proyecto

### Moneda y formato
- **Todos los precios y montos en MXN**, formateados con `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })` vía helper `formatMXN()` en `lib/format.ts`.
- **Almacenamiento en centavos como `integer`** en la base de datos. NUNCA almacenar como decimal o float. Conversión a pesos solo en presentación.
- Inputs aceptan pesos con decimales; al guardar se multiplican por 100 para centavos.

### Idioma y localización
- **Todo el UI en español** (es-MX).
- Fechas en formato amigable español: "lunes 18 de mayo" no "2026-05-18".
- Mensajes de error, labels, placeholders, todo en español.

### Diseño visual (dark mode obligatorio)
Paleta exacta — no modificar sin autorización explícita:
--color-bg:         #000000  (fondo principal de la app)
--color-surface:    #171717  (cards, modales, secciones elevadas)
--color-surface-2:  #262626  (hover states, separadores, surfaces anidados)
--color-text:       #FAFAFA  (texto principal)
--color-text-strong:#FFFFFF  (texto enfático, totales, headers)
--color-muted:      #A3A3A3  (texto secundario, labels)
--color-border:     #262626  (bordes default)
--color-border-hi:  #404040  (bordes en hover/focus)
--color-accent:     #FFD944  (amarillo — uso libre para jerarquía visual)
--color-accent-2:   #F0C920  (amarillo más oscuro para hover de botones primary)
--color-success:    #4ADE80  (verde claro para confirmaciones)
--color-error:      #F87171  (rojo claro para errores)

### Uso del amarillo accent (#FFD944)
- Botones primarios (Cobrar, Guardar, Crear): bg amarillo, texto negro.
- Indicadores de página activa en nav.
- Highlights numéricos importantes (totales del día, ticket promedio, utilidad neta).
- Acentos en gráficas.
- Badges de elementos seleccionados.
- **NUNCA** usar amarillo para texto sobre fondo negro (mal contraste) ni para fondos grandes de página (cansa la vista) ni para errores/warnings semánticos.

### Tipografía
- **Inter** para todo el UI. Pesos 400, 500, 600.
- Tamaños limitados: `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px), `text-3xl` (30px), `text-5xl` (48px), `text-6xl` (60px para totales más prominentes).

### UI optimizada para tablet
- Botones cumplen `min-h-[60px]` mínimo desde tamaño `md` hacia arriba.
- Botones de productos en `/pos` son `min-h-[80px]` (tap rápido en tablet).
- Touch targets generosos. Spacing amplio.

### Componentes UI (en `components/ui/`)
- `Button` con variantes: `primary`, `secondary`, `ghost`, `danger`. Tamaños: `sm`, `md`, `lg`, `xl`.
- `Card`, `Input`, `Select`, `Textarea`, `Modal`, `Badge`, `StatCard`.
- Usar estos componentes siempre antes de inventar variaciones inline.

### Logo de SQNAR
- El logo vive en `components/SqnarLogo.tsx` como componente reusable con prop `size`
- NUNCA hardcodear el logo en páginas — siempre importar el componente
- Las ondas y el punto central deben mantener el color amarillo accent (#FFD944)
- No alterar las opacidades de las ondas (full / 0.7 / 0.4) — son parte de la identidad

### Reglas estrictas de diseño
- **NO** sombras dramáticas (no funcionan en dark mode plano). Usar bordes y diferencia de surface.
- **NO** gradientes. Todo flat.
- **NO** otros colores fuera de la paleta. Sin morados, azules, naranjas.
- Transiciones suaves: `transition-all duration-150 ease-out` en interactivos.
- Focus visible: `ring-2 ring-accent ring-offset-2 ring-offset-bg`.

## Multi-tenancy

El esquema está migrado a multi-tenant. Todas las tablas de negocio tienen una columna `empresa_id uuid NOT NULL FK → empresas`, excepto `tipos_gasto` que es catálogo global compartido por todas las empresas.

### Tablas de infraestructura multi-tenant
- `empresas (id, nombre, slug, created_at, updated_at)` — cada cliente es una empresa
- `usuarios (id, empresa_id, email, nombre, created_at)` — `id` = `auth.users.id` de Supabase Auth

### Empresa "demo" (datos legacy del piloto)
- **ID fijo**: `00000000-0000-0000-0000-000000000001`
- Todos los datos históricos (productos, turnos, órdenes, gastos) creados antes de la migración viven en esta empresa.
- Las API routes deben filtrar siempre por `empresa_id`. Mientras no haya autenticación real, se usa el ID de demo como hardcoded temporal.

### Tipos en `lib/types.ts`
Todos los tipos canónicos están en `lib/types.ts`. Importar desde ahí en API routes y componentes:
```ts
import type { Producto, Orden, Turno, Gasto, Empresa, Usuario } from "@/lib/types";
```
Los tipos en los archivos de páginas son legacy inline; migrar gradualmente a `lib/types.ts`.

---

## Arquitectura de la base de datos

### Tablas existentes en Supabase
Todas llevan `empresa_id` excepto `tipos_gasto`:
- `empresas`: directorio de clientes (multi-tenant)
- `usuarios`: usuarios por empresa, id = auth.users.id
- `categorias`: categorías de productos (por empresa)
- `productos`: productos con `precio` y `costo` en centavos (por empresa)
- `turnos`: aperturas y cierres de caja con `efectivo_inicial`, `efectivo_final_real`, `diferencia` (por empresa)
- `ordenes`: ventas con `total`, `propina`, `metodo_pago` ('efectivo' | 'tarjeta'), `turno_id` (por empresa)
- `orden_items`: items de cada orden con `cantidad`, `precio_unitario`, `producto_id` (por empresa)
- `tipos_gasto`: 9 categorías pre-cargadas — **catálogo global, sin empresa_id**
- `gastos_mensuales`: gastos por mes con unique en (mes, año, tipo_gasto_id, empresa_id) (por empresa)

### Reglas de queries
- **Joins con embed de Supabase** cuando se necesitan datos relacionados: `.select('*, categoria:categorias(id, nombre)')`.
- **Total de ventas se calcula en backend**, no en frontend (seguridad).
- **Comparativos del día**: query directo con rangos de fecha, no múltiples roundtrips.
- **Tipos**: `disponible` en productos es `boolean` (NO `1`/`0` — fue bug ya arreglado de la migración desde SQLite).
- **Row-Level Security DESHABILITADO** en todas las tablas por ahora. Se habilitará en la fase de auth con Supabase Auth + policies por `empresa_id`.

### Manejo de caché en Next.js
**Crítico**: las API routes GET y los fetches del frontend deshabilitan caché para que los datos sean fresh siempre:

```ts
// En API routes:
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// En fetches del frontend:
fetch('/api/...', { cache: 'no-store' })

// Después de mutaciones (POST/PATCH/DELETE):
router.refresh();
```

Este patrón ya está aplicado en todas las routes existentes. Mantenerlo para nuevas.

## Estructura de páginas existentes

- `/` — Landing con CTA "Abrir caja"
- `/pos` — Pantalla de caja (turno + productos + ticket + cobro)
- `/admin/productos` — CRUD de productos con costo y margen
- `/corte` — Resumen del día con KPIs, comparativos, top productos, gráfica por hora
- `/corte/turno` — Cierre de turno con cuadre de efectivo
- `/finanzas` — Dashboard de Salud Financiera (KPIs + cascada + punto de equilibrio + top 5 productos)
- `/finanzas/productos` — Ranking de productos por rentabilidad con análisis e insights
- `/finanzas/gastos` — Captura mensual de gastos por categoría

## Navegación
Top nav sticky con links: Caja (`/pos`), Productos (`/admin/productos`), Corte (`/corte`), Finanzas (`/finanzas`). Logo SQNAR (`<SqnarLogo size="md" />`) a la izquierda.

## Variables de entorno

Locales en `.env.local`, en producción en Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

`.env.example` en repo público sin valores.

## Convenciones de código

### TypeScript
- Tipos explícitos para todos los modelos de datos (Producto, Orden, Turno, Gasto, TipoGasto).
- Evitar `any`. Si es necesario, comentar por qué.
- Server components por default; `'use client'` solo cuando se necesita interactividad.

### Manejo de errores en API routes
Siempre verificar `if (error)` después de queries a Supabase y retornar status 500 con el mensaje. No fallar silenciosamente. Ejemplo:

```ts
const { data, error } = await supabase.from('productos').select('*');
if (error) {
  return Response.json({ error: error.message }, { status: 500 });
}
return Response.json(data);
```

### Git workflow
- Commits descriptivos: `feat:`, `fix:`, `chore:`, `style:`, `docs:`.
- Mensaje en español o inglés está bien, mantener consistencia dentro del mismo commit.
- Push directo a `main` por ahora (proyecto solo, sin PRs).
- Vercel auto-deploya con cada push.

### Estilo de respuesta deseado
- Trabajar en pasos pequeños cuando los prompts son grandes, dividir en partes verificables.
- Confirmar después de cada cambio significativo antes de avanzar.
- Cuando se necesite SQL para Supabase, **siempre presentarlo en un bloque ```sql en el chat**, no guardarlo solo en archivos.
- Cuando se modifica el esquema de DB, dar instrucciones claras de qué correr en Supabase SQL Editor.

## Decisiones de producto ya tomadas (no debatir de nuevo)

- **Esquema multi-tenant implementado** (empresa_id en todas las tablas). Auth y RLS vienen después del piloto.
- **Sin login** por ahora. Auth con Supabase Auth + RLS por empresa_id cuando llegue la fase de auth.
- **Captura de costos por producto** (no por categoría) — decisión del fundador.
- **9 categorías de gastos pre-cargadas** estándar de cafetería/restaurante.
- **Métodos de pago**: efectivo y tarjeta. Tarjeta es manual por ahora; integración con terminal/QR es roadmap.
- **Propina** se captura en el POS (no en la terminal bancaria) por simplicidad inicial.
- **Modo offline**: no soportado por ahora. Roadmap si los pilotos lo piden.
- **Ranking de productos por rentabilidad implementado**. Permite identificar productos con alto margen vs alto volumen. Insight automático cuando hay desalineación entre el más vendido y el que más ganancia genera.

## Roadmap conocido (no construir sin pedirlo explícito)

1. **Multi-tenant**: login + separación de datos por empresa + dashboard de plataforma con catálogo de apps.
2. **Integración Mercado Pago QR**: cobro automático por QR.
3. **Integración con terminales físicas**: Clip Total, Mercado Pago Point.
4. **Facturación CFDI 4.0** desde el ticket.
5. **Programa de lealtad** simple.
6. **Inventario en tiempo real** con alertas.
7. **Multi-sucursal** con consolidación.
8. **Modo offline** con sync.

## Contexto del fundador

Fundador: santiagoch07 (Santiago Chavez), estudiante y emprendedor en Monterrey, MX. Desarrollo activo del proyecto. Prefiere:

- Pasos pequeños y verificables sobre prompts gigantes.
- Explicaciones del *porqué* además del *qué*.
- Commits frecuentes con git push para tener versión segura.
- Comunicación en español.
- Pragmatismo sobre perfeccionismo — terminar > pulir.

## Patrón de uso del middleware y empresa_id

El archivo `middleware.ts` en la raíz protege todas las rutas excepto `/login`, `/registro` y `/api/registro/empresa`. Si un usuario no autenticado intenta acceder a cualquier otra ruta, es redirigido a `/login`.

En API routes que necesitan datos del usuario logueado, usar siempre el helper `getEmpresaIdFromSession()` de `lib/auth-server.ts`:

```ts
import { getEmpresaIdFromSession } from '@/lib/auth-server';

export async function GET() {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();
  const { data } = await supabase
    .from('productos')
    .select('*')
    .eq('empresa_id', empresaId);

  return NextResponse.json(data);
}
```

**Reglas críticas:**
- Nunca hardcodear `empresa_id` en queries de producción.
- Nunca confiar en `empresa_id` que venga del cliente (body, query param, header).
- `getEmpresaIdFromSession()` siempre va antes de cualquier query a la BD en una API route protegida.

## Anti-patrones a evitar

- **No agregar features que no se pidieron explícitamente.** Si el prompt dice "agrega X", no agregues también Y porque parece relacionado.
- **No cambiar la paleta de colores ni la tipografía** sin pedir confirmación.
- **No instalar paquetes pesados** sin avisar (ej. UI libraries completas, ORMs).
- **No tocar `lib/supabase.ts` ni las variables de entorno** sin necesidad explícita.
- **No habilitar Row-Level Security** todavía (es para fase multi-tenant).
- **No usar `any` en TypeScript** salvo casos justificados.
- **No reformatear archivos completos** cuando solo se piden cambios específicos.

