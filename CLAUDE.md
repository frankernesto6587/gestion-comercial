# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) para trabajar con el código de este repositorio.

## Descripción del Proyecto

Aplicación web para gestión comercial de importaciones. Permite registrar importaciones, calcular precios automáticamente basados en costos/márgenes, controlar inventario y generar reportes exportables a Excel.

**Stack**: Next.js 16 (App Router), Tailwind CSS v4, PostgreSQL 16, Prisma 6.x, Zod, React Hook Form, xlsx

# Global Project Rules

## Dates & Timezone (MANDATORY)

- All dates MUST be handled using timezone: **America/Havana**
- Date format MUST ALWAYS be: **DD-MM-YYYY**
- Datetime format MUST be: **DD-MM-YYYY HH:mm:ss**
- Never use system timezone or UTC unless explicitly requested
- Never use ISO date strings in business logic or persistence

## Technical Rules

- Always use TypeScript with strict typing
- Always use modern JavaScript/TypeScript practices
- Always use date libraries (never native Date without timezone)
- All tests, mocks, seeds and fixtures MUST respect Havana timezone

## Comandos

```bash
# Desarrollo con Docker
docker compose up -d                    # Iniciar aplicación
docker compose logs -f app              # Ver logs en tiempo real
docker compose down && docker compose up -d --build  # Reconstruir después de cambios

# Prisma (dentro del contenedor)
docker compose exec app pnpm prisma migrate dev     # Ejecutar migraciones
docker compose exec app pnpm prisma generate        # Generar cliente

# Desarrollo local (sin Docker)
pnpm dev                                # Iniciar servidor de desarrollo
pnpm build                              # Compilar para producción
pnpm lint                               # Ejecutar ESLint
```

**URL de la aplicación**: http://localhost:3000

## Arquitectura

### Rutas API (`src/app/api/`)
Endpoints REST usando convenciones de Next.js App Router:
- `/api/productos` - CRUD de productos
- `/api/importaciones` - CRUD de importaciones con productos anidados
- `/api/inventario` - Gestión de inventario con movimientos
- `/api/dashboard` - Métricas del dashboard
- `/api/reportes` - Generación de reportes

### Librerías Core (`src/lib/`)
- `db.ts` - Cliente Prisma singleton (maneja hot reload en desarrollo)
- `calculations.ts` - Fórmulas de cálculo de precios usando Decimal.js para precisión
- `validations.ts` - Esquemas Zod para todas las entidades
- `excel.ts` - Utilidades de exportación a Excel

### Lógica de Cálculo de Precios
Ubicada en `src/lib/calculations.ts`. Fórmulas principales:
```
precioVentaUSD = costoTotalUSD / (1 - margenUtilidad / 100)
cantidadVendible = cantidadUnidades * (1 - porcentajeMerma / 100)
```

Ejemplo con datos reales (Malta Bucanero):
- Cantidad: 1,800 unidades, Importe: $590.77 USD
- Costo unitario: $0.33 USD
- Con margen 15%: Precio venta = $0.39 USD = 123.56 CUP (tasa 320)
- Merma 2%: Cantidad vendible = 1,764 unidades

### Modelos de Base de Datos (Prisma)
- `Producto` - Catálogo de productos (con código de referencia opcional)
- `Importacion` - Contenedor/envío de importación
- `ProductoImportado` - Líneas de importación con parámetros de costo y precios calculados
- `Inventario` + `MovimientoInventario` - Control de stock (ENTRADA, SALIDA, MERMA, AJUSTE_POS, AJUSTE_NEG)

## Patrones Importantes

### Tailwind CSS v4
Los colores personalizados deben definirse en `@theme inline` en `globals.css`:
```css
@theme inline {
  --color-muted: var(--text-muted);
}
```

### Campos Opcionales en Zod
Los campos opcionales que pueden venir como `null` desde formularios necesitan ambos modificadores:
```typescript
numeroContenedor: z.string().optional().nullable(),
```

### Versión de Prisma
Mantener Prisma 6.x - la versión 7 tiene breaking changes con la configuración del datasource.

## Gestor de Paquetes

Este proyecto usa **pnpm**. Siempre usar `pnpm` para instalar dependencias.
