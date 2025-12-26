# Plan: Módulo de Ventas con FIFO

## Resumen
Crear módulo de ventas que genera registros de venta basándose en transferencias bancarias reales, usando FIFO para precios y distribuyendo por canales (91% USD, 5% Fiscal, 4% Efectivo).

## Flujo Completo
Ver documentación detallada en: `docs/flujo-ventas.md`

## Archivos a Crear

### 1. Modelo de Base de Datos
**`prisma/schema.prisma`** - Agregar modelos:
```prisma
model Venta {
  id                   Int      @id @default(autoincrement())
  fechaInicio          DateTime
  fechaFin             DateTime
  totalTransferencias  Decimal  @db.Decimal(15, 2)
  totalUnidades        Int
  totalCUP             Decimal  @db.Decimal(15, 2)
  modoDistribucion     String   // "MANUAL" | "AUTO"
  observaciones        String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  lineas               LineaVenta[]
  transferencias       TransferenciaVenta[]
}

model TransferenciaVenta {
  id        Int      @id @default(autoincrement())
  ventaId   Int
  fecha     DateTime
  monto     Decimal  @db.Decimal(15, 2)

  venta     Venta    @relation(fields: [ventaId], references: [id], onDelete: Cascade)
}

model LineaVenta {
  id                  Int      @id @default(autoincrement())
  ventaId             Int
  fecha               DateTime
  productoId          Int
  productoImportadoId Int
  canal               String   // "USD" | "FISCAL" | "EFECTIVO"
  cantidad            Int
  precioUnitario      Decimal  @db.Decimal(15, 4)
  subtotal            Decimal  @db.Decimal(15, 2)
  createdAt           DateTime @default(now())

  venta             Venta             @relation(fields: [ventaId], references: [id], onDelete: Cascade)
  producto          Producto          @relation(fields: [productoId], references: [id])
  productoImportado ProductoImportado @relation(fields: [productoImportadoId], references: [id])
}
```

### 2. Librería FIFO y Cálculos
**`src/lib/ventas.ts`**
- `obtenerPreciosFIFO(productoId, fecha)` - Obtener precios del lote más antiguo
- `calcularDistribucion(transferencias, productos, modo)` - Calcular unidades por canal
- `generarLineasVenta(distribucion, periodo)` - Generar líneas por día
- `calcularDiasHabiles(fechaInicio, fechaFin, diasTransferencia)` - Días sin transferencia

### 3. Validaciones
**`src/lib/validations.ts`** - Agregar schemas:
- `ventaSchema`
- `transferenciaVentaSchema`
- `distribucionProductoSchema`

### 4. Endpoints API
**`src/app/api/ventas/route.ts`**
- `GET` - Listar ventas con paginación y filtros
- `POST` - Crear venta (genera todas las líneas)

**`src/app/api/ventas/[id]/route.ts`**
- `GET` - Detalle de venta con líneas
- `DELETE` - Eliminar venta (revertir inventario)

**`src/app/api/ventas/[id]/excel/route.ts`**
- `GET` - Exportar venta a Excel

### 5. Páginas UI
**`src/app/ventas/page.tsx`** - Lista de ventas
- Tabla con período, total transferencias, total CUP
- Filtros por fecha
- Botón "Nueva Venta"
- Acciones: Ver, Exportar Excel, Eliminar

**`src/app/ventas/nueva/page.tsx`** - Crear venta (2 pasos)

**Paso 1: Configuración**
- Inputs: Fecha inicio, Fecha fin
- Tabla de transferencias (fecha + monto)
- Selector de productos con stock
- Toggle: Modo Manual / Automático
- Si manual: inputs de porcentaje por producto
- Botón "Calcular Distribución"

**Paso 2: Preview y Confirmación**
- Tabla completa de ventas sugeridas por día:
  | Fecha | Producto | Canal | Unidades | Precio | Subtotal |
- Totales por producto y canal
- Resumen: total unidades, total CUP
- Botones:
  - "Volver" → regresa a Paso 1 para modificar parámetros
  - "Recalcular" → genera nueva distribución con mismos parámetros
  - "Guardar" → confirma y guarda en DB

**`src/app/ventas/[id]/page.tsx`** - Detalle de venta
- Resumen: período, totales
- Tabla de líneas agrupadas por día/producto
- Totales por producto y canal
- Botón exportar Excel

### 6. Componentes
**`src/components/ventas/`**
- `TransferenciasInput.tsx` - Tabla editable de transferencias
- `ProductoSelector.tsx` - Selector de productos con stock
- `DistribucionPreview.tsx` - Preview de cálculos
- `VentaResumen.tsx` - Resumen de venta

### 7. Navegación
**`src/components/NavBar.tsx`** - Agregar link a Ventas

## Orden de Implementación

1. Modelos Prisma + migración
2. Librería de cálculos (`src/lib/ventas.ts`)
3. Validaciones Zod
4. API endpoints (GET/POST/DELETE)
5. Página lista de ventas
6. Página crear venta
7. Página detalle de venta
8. Exportación Excel
9. Agregar link en NavBar

## Consideraciones Técnicas

- **Redondeo**: `Math.ceil()` para fiscal, `Math.floor()` para USD/Efectivo
- **FIFO**: Ordenar por fecha de importación ascendente
- **Stock**: Validar disponibilidad antes de crear venta
- **Inventario**: Decrementar al crear, incrementar al eliminar
- **Días hábiles**: Lunes a Sábado (configurable)
