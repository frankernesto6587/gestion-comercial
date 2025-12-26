# Plan: Validar stock antes de calcular distribución de ventas

## Objetivo
Al configurar una venta (ANTES de dar click en "Calcular Distribución"), validar:
1. **Stock suficiente**: Que cada producto tenga stock para cubrir las unidades según su porcentaje asignado
2. **Cobertura de liquidez**: Que las ventas proyectadas cubran el monto total de transferencias

Si no se cumplen, **bloquear** la operación mostrando mensaje de error.

## Lógica de Validación

### Fórmula base
```
Las transferencias = porcentajeVentaFiscal% del TOTAL a reportar

Ejemplo con 60M en transferencias y porcentajeVentaFiscal = 5%:
  TOTAL = 60M / 0.05 = 1,200 millones CUP

  Venta USD (91%)      = 1,200M × 0.91 = 1,092M
  Venta Fiscal (5%)    = 1,200M × 0.05 = 60M   ← transferencias
  Venta Efectivo (4%)  = 1,200M × 0.04 = 48M
```

### 1. Calcular unidades necesarias por producto
```
PASO 1: Calcular el MONTO TOTAL a partir de las transferencias
  # Las transferencias son el porcentajeVentaFiscal% del total
  # Porcentajes vienen de la importación FIFO del producto

  MONTO_TOTAL = totalTransferencias / (porcentajeVentaFiscal / 100)

  Ejemplo: 60M transferencias, 5% fiscal
  MONTO_TOTAL = 60,000,000 / 0.05 = 1,200,000,000 CUP

PASO 2: Para cada producto con porcentaje P:
  # El porcentaje P indica qué proporción del MONTO TOTAL corresponde a este producto
  montoTotalProducto = MONTO_TOTAL × (P / 100)

PASO 3: Calcular unidades POR CADA CANAL DE VENTA con su precio específico
  # Obtener precios y porcentajes de la importación FIFO
  precioUSD, precioFiscal, precioEfectivo = precios del productoImportado
  pctUSD = porcentajeVentaUSD (default 91%)
  pctFiscal = porcentajeVentaFiscal (default 5%)
  pctEfectivo = porcentajeVentaEfectivo (default 4%)

  # Calcular monto por canal
  montoUSD = montoTotalProducto × (pctUSD / 100)
  montoFiscal = montoTotalProducto × (pctFiscal / 100)
  montoEfectivo = montoTotalProducto × (pctEfectivo / 100)

  # Calcular unidades necesarias por canal (cada canal tiene su precio)
  unidadesUSD = montoUSD / precioUSD
  unidadesFiscal = montoFiscal / precioFiscal
  unidadesEfectivo = montoEfectivo / precioEfectivo

  # TOTAL DE UNIDADES NECESARIAS
  unidadesNecesarias = unidadesUSD + unidadesFiscal + unidadesEfectivo

  SI unidadesNecesarias > stockDisponible → ERROR de stock

EJEMPLO:
  montoTotalProducto = 480,000,000 CUP (40% de 1,200M)

  Canal USD (91%):      montoUSD = 436,800,000 / precioUSD(320) = 1,365,000 uds
  Canal Fiscal (5%):    montoFiscal = 24,000,000 / precioFiscal(123.56) = 194,239 uds
  Canal Efectivo (4%):  montoEfectivo = 19,200,000 / precioEfectivo(173) = 110,983 uds

  TOTAL UNIDADES NECESARIAS = 1,670,222 unidades
```

### 2. Validar cobertura de liquidez
```
Para cada producto:
  # Calcular cuántas unidades se asignarán según el porcentaje P y precios por canal
  # (inverso del cálculo anterior)

  # Dado el stock disponible, calcular cuántas transferencias puede cubrir
  # Distribuir stock proporcionalmente entre canales según porcentajes

  stockUSD = stockDisponible × (pctUSD / 100)
  stockFiscal = stockDisponible × (pctFiscal / 100)
  stockEfectivo = stockDisponible × (pctEfectivo / 100)

  # Calcular valor generado por cada canal
  valorUSD = stockUSD × precioUSD
  valorFiscal = stockFiscal × precioFiscal
  valorEfectivo = stockEfectivo × precioEfectivo

  # El valor total que puede generar este stock
  valorTotalStock = valorUSD + valorFiscal + valorEfectivo

  # Las transferencias cubiertas son el pctFiscal% del valor total
  transferenciasCubiertas = valorTotalStock × (pctFiscal / 100)

totalTransferenciasCubiertas = suma de transferenciasCubiertas × (P / 100) por producto
SI totalTransferencias > totalTransferenciasCubiertas → ERROR de liquidez

Ejemplo: 1800 unidades en stock
  stockUSD = 1800 × 0.91 = 1638, valorUSD = 1638 × 320 = 524,160
  stockFiscal = 1800 × 0.05 = 90, valorFiscal = 90 × 123.56 = 11,120
  stockEfectivo = 1800 × 0.04 = 72, valorEfectivo = 72 × 173 = 12,456
  valorTotalStock = 547,736 CUP
  transferenciasCubiertas = 547,736 × 0.05 = 27,387 CUP
```

## Archivos a Modificar

### 1. `src/lib/ventas.ts`
Crear nueva función:
```typescript
export async function validarStockParaVenta(
  fechaFin: Date,
  totalTransferencias: number,
  productosDistribucion: { productoId: number; porcentaje: number }[]
): Promise<{ valido: boolean; errores: string[] }>
```

### 2. `src/app/api/ventas/validar-stock/route.ts` (NUEVO)
Endpoint POST para validar antes de calcular:
- Recibe: fechaFin, totalTransferencias, productos con porcentajes
- Retorna: { valido: boolean, errores: string[], detalles: {...} }

### 3. `src/app/ventas/nueva/page.tsx`
- Llamar a `/api/ventas/validar-stock` ANTES de llamar a `/api/ventas/calcular`
- Mostrar errores en UI si la validación falla
- Bloquear botón "Calcular Distribución" hasta que sea válido

## Mensajes de Error

- **Stock insuficiente**: "El producto {nombre} requiere {N} unidades pero solo hay {M} en stock"
- **Liquidez insuficiente**: "Las transferencias ({X} CUP) no cubren el valor de las ventas proyectadas ({Y} CUP)"

## Flujo Actualizado

```
1. Usuario configura fechas, transferencias, productos y porcentajes
2. Al hacer click en "Calcular Distribución":
   a. Llamar POST /api/ventas/validar-stock
   b. Si hay errores → mostrar y NO continuar
   c. Si válido → llamar POST /api/ventas/calcular (flujo existente)
```
