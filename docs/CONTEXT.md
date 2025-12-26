# Contexto del Proyecto: Gestión Comercial

## Resumen

Aplicación web para gestionar importaciones comerciales, calcular precios automáticamente basados en costos, controlar inventario y generar reportes exportables a Excel.

**Estado actual**: Funcionando en Docker con todas las funcionalidades básicas implementadas y testeadas.

---

## Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | Next.js (App Router) | 16.0.10 |
| UI | Tailwind CSS + Headless UI | v4 / 2.2.9 |
| Base de datos | PostgreSQL | 16-alpine |
| ORM | Prisma | 6.9.0+ |
| Contenedores | Docker + Docker Compose | - |
| Validación | Zod | 4.2.1 |
| Formularios | React Hook Form | 7.68.0 |
| Exportación Excel | xlsx | 0.18.5 |

---

## Comandos Docker Importantes

```bash
# Iniciar la aplicación
docker compose up -d

# Ver logs en tiempo real
docker compose logs -f app

# Reiniciar después de cambios
docker compose down && docker compose up -d --build

# Ejecutar migraciones
docker compose exec app pnpm prisma migrate dev

# Generar cliente Prisma (si hay errores de módulo)
docker compose exec app pnpm prisma generate

# Acceder al contenedor
docker compose exec app sh
```

**URL de la aplicación**: http://localhost:3000

---

## Estructura de Archivos Clave

```
gestion-comercial/
├── prisma/
│   └── schema.prisma          # Esquema de base de datos
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── importaciones/ # API CRUD importaciones
│   │   │   ├── inventario/    # API inventario
│   │   │   └── productos/     # API productos
│   │   ├── importaciones/
│   │   │   ├── nueva/         # Formulario nueva importación
│   │   │   └── [id]/          # Detalle de importación
│   │   ├── productos/         # CRUD productos
│   │   ├── inventario/        # Vista de inventario
│   │   └── globals.css        # Estilos y tema Tailwind v4
│   ├── components/
│   │   └── ui/                # Componentes reutilizables
│   └── lib/
│       ├── db.ts              # Cliente Prisma
│       ├── calculations.ts    # Fórmulas de cálculo de precios
│       └── validations.ts     # Esquemas Zod
├── Dockerfile                 # Multi-stage build
├── docker-compose.yml         # Configuración desarrollo
└── package.json
```

---

## Modelos de Base de Datos

### Producto
- `id`, `codefref` (opcional, único), `nombre`, `descripcion`, `unidadMedida`, `activo`

### Importacion
- `id`, `fecha`, `numeroContenedor`, `importadora`, `observaciones`
- Relación: tiene muchos `ProductoImportado`

### ProductoImportado
- Datos de factura: `cantidadUnidades`, `importeUSD`
- Costos adicionales: `arancelesCUP`, `serviciosImportadora`
- Parámetros: `porcentajeMerma`, `margenUtilidad`, `tasaCambio`
- Calculados: `costoUnitarioUSD`, `precioVentaUSD`, `precioVentaCUP`

### Inventario
- `productoId`, `cantidadActual`, `cantidadMinima`
- Relación: tiene muchos `MovimientoInventario`

### MovimientoInventario
- Tipos: `ENTRADA`, `SALIDA`, `MERMA`, `AJUSTE_POS`, `AJUSTE_NEG`

---

## Fórmulas de Cálculo de Precios

```typescript
// En src/lib/calculations.ts

// 1. Costo unitario bruto
costoUnitarioUSD = importeUSD / cantidadUnidades

// 2. Costos adicionales por unidad
costosAdicionalesUSD = (arancelesCUP + serviciosImportadora) / tasaCambio / cantidadUnidades

// 3. Costo total por unidad
costoTotalUSD = costoUnitarioUSD + costosAdicionalesUSD

// 4. Precio de venta (aplicando margen)
precioVentaUSD = costoTotalUSD / (1 - margenUtilidad / 100)

// 5. Conversión a CUP
precioVentaCUP = precioVentaUSD * tasaCambio

// 6. Cantidad vendible (descontando merma)
cantidadVendible = cantidadUnidades * (1 - porcentajeMerma / 100)
```

---

## Problemas Resueltos

### 1. Tailwind CSS v4 - Colores personalizados
**Error**: `Cannot apply unknown utility class 'placeholder:text-muted'`
**Solución**: Agregar colores a `@theme inline` en `globals.css`:
```css
@theme inline {
  --color-muted: var(--text-muted);
  --color-secondary: var(--text-secondary);
}
```

### 2. Prisma 7 - Breaking changes
**Error**: `The datasource property 'url' is no longer supported`
**Solución**: Usar Prisma 6.x en lugar de 7.x

### 3. pnpm en Docker
**Error**: `sh: next: not found` después de montar volumen
**Solución**:
- Usar volúmenes nombrados para `node_modules` y `.next`
- Ejecutar `pnpm install` al inicio del contenedor

### 4. Validación Zod - Campos null
**Error**: `expected string, received null` para campos opcionales
**Solución**: Agregar `.nullable()` a campos opcionales en `validations.ts`:
```typescript
numeroContenedor: z.string().max(50).optional().nullable(),
observaciones: z.string().max(500).optional().nullable(),
```

---

## Datos de Prueba Exitosos

Importación creada y verificada:
- **Importadora**: Serlovem
- **Producto**: Cerveza Bucanero - Lata 350ml
- **Cantidad**: 1800 unidades
- **Importe**: $590.77 USD
- **Tasa de cambio**: 320 CUP/USD
- **Margen**: 15%
- **Merma**: 2%

**Resultados calculados**:
- Costo unitario: $0.33 USD
- Precio venta: $0.39 USD
- Precio CUP: 123.56 CUP

---

## Próximas Funcionalidades Pendientes

- [ ] Dashboard con métricas principales
- [ ] Exportación a Excel (.xlsx)
- [ ] Reportes por período
- [ ] Alertas de stock bajo
- [ ] Gráficos de rentabilidad
- [ ] Configuración de parámetros por defecto

---

## Notas para Claude

1. La aplicación corre en Docker - siempre usar `docker compose` para comandos
2. Tailwind v4 usa `@theme inline` para colores personalizados
3. Prisma v6.x - no actualizar a v7 sin revisar breaking changes
4. Los campos opcionales en Zod necesitan `.nullable()` además de `.optional()`
5. El proyecto usa pnpm como gestor de paquetes
