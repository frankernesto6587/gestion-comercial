import Decimal from "decimal.js";

// Configurar precisión de Decimal.js
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface DatosProductoImportado {
  cantidadUnidades: number;
  importeUSD: number;
  porcentajeMerma?: number;
  margenUtilidad?: number;
}

export interface DatosContenedor {
  tasaCambioUSD?: number;
  // Totales de gastos del contenedor (convertidos a CUP usando las tasas)
  totalGastosCUP?: number;
  // Total de unidades en el contenedor (para prorrateo de gastos)
  totalUnidadesContenedor?: number;
}

// Interface combinada para cálculos de producto
export interface DatosImportacion extends DatosProductoImportado {
  // Gastos prorrateados por producto (calculados externamente)
  gastosPorrateadosCUP?: number;
  tasaCambio?: number;

  // Parámetros de Leyenda (del contenedor)
  porcentajeVentaUSD?: number;      // 91% - porcentaje de venta en USD
  porcentajeVentaFiscal?: number;   // 5% - porcentaje de venta a cuenta fiscal
  porcentajeVentaEfectivo?: number; // 4% - porcentaje de venta en efectivo
  porcentajeMargenComercial?: number; // 85% - margen comercial

  // Media de precios fiscales (del producto)
  mediaPrecioFiscal?: number;         // 173 - para venta fiscal
  mediaPrecioFiscalEfectivo?: number; // 173 - para venta efectivo (se multiplica por 90%)

  // Porcentaje de otros gastos (para costos e impuestos)
  porcentajeOtrosGastos?: number;     // 10% por defecto
}

export interface ResultadoCalculo {
  // ============================================
  // COSTOS (ya existentes)
  // ============================================
  costoUnitarioUSD: Decimal;
  costoUnitarioCUP: Decimal;
  costoBrutoUnitario: Decimal;  // NUEVO: Costo USD + gastos por unidad

  // ============================================
  // CANTIDADES (ya existentes + nuevas)
  // ============================================
  cantidadVendible: Decimal;
  cantidadMerma: Decimal;
  cantidadVentaUSD: Decimal;      // NUEVO: 91% de cantidad vendible
  cantidadVentaFiscal: Decimal;   // NUEVO: 5% de cantidad vendible
  cantidadVentaEfectivo: Decimal; // NUEVO: 4% de cantidad vendible

  // ============================================
  // PRECIOS DE VENTA (ya existentes + nuevos)
  // ============================================
  precioVentaUSD: Decimal;
  precioVentaCUP: Decimal;
  precioFiscalCUP: Decimal;    // mediaPrecioFiscal (sin multiplicar por 90%)
  precioEfectivoCUP: Decimal;  // mediaPrecioFiscalEfectivo × 90%

  // ============================================
  // VENTAS POR CANAL (NUEVAS)
  // ============================================
  ventaUSDEnCUP: Decimal;      // Cantidad USD * Precio CUP
  ventaFiscalCUP: Decimal;     // Cantidad Fiscal * Precio Fiscal
  ventaEfectivoCUP: Decimal;   // Cantidad Efectivo * Precio Efectivo
  ventaTotalFiscal: Decimal;   // Suma de todas las ventas

  // ============================================
  // ANÁLISIS FINANCIERO (ya existentes)
  // ============================================
  inversionTotal: Decimal;
  ventasTotalesUSD: Decimal;
  ventasTotalesCUP: Decimal;
  utilidadBrutaUSD: Decimal;
  utilidadBrutaCUP: Decimal;
  porcentajeUtilidad: Decimal;

  // ============================================
  // COSTOS E IMPUESTOS (NUEVOS)
  // ============================================
  costoProductosCUP: Decimal;    // Importe USD * Tasa
  otrosGastosPorciento: Decimal; // (Costo + Gastos) * %OtrosGastos
  costoTotalBruto: Decimal;      // Costo + Gastos + 10%
  aporte11Porciento: Decimal;    // Venta Total * 11%
  impuesto35Utilidad: Decimal;   // Utilidad * 35%
  totalImpuestos: Decimal;       // 11% + 35%
  cargaTributaria: Decimal;      // Total Impuestos / Venta Total * 100

  // ============================================
  // UTILIDAD REAL (NUEVO)
  // ============================================
  utilidadEstimada: Decimal;     // Venta Total - Costo Total Bruto
  porcentajeUtilidadEstimada: Decimal; // Utilidad / Venta Total * 100
  utilidadBrutaReal: Decimal;    // Venta Total - Costo Total - Impuestos

  // ============================================
  // PUNTO DE EQUILIBRIO (ya existentes)
  // ============================================
  unidadesParaRecuperar: Decimal;
  porcentajeUnidadesRecuperar: Decimal;
}

/**
 * Calcula todos los precios y métricas basándose en los datos de la importación.
 * Implementa las fórmulas del Excel original.
 */
export function calcularPrecios(datos: DatosImportacion): ResultadoCalculo {
  const {
    cantidadUnidades,
    importeUSD,
    gastosPorrateadosCUP = 0,
    porcentajeMerma = 2,
    margenUtilidad = 15,
    tasaCambio = 320,
    // Parámetros de Leyenda
    porcentajeVentaUSD = 91,
    porcentajeVentaFiscal = 5,
    porcentajeVentaEfectivo = 4,
    porcentajeMargenComercial = 85,
    // Media de precios fiscales
    mediaPrecioFiscal = 173,
    mediaPrecioFiscalEfectivo = 173,
    // Porcentaje de otros gastos
    porcentajeOtrosGastos = 10,
  } = datos;

  // Convertir a Decimal para precisión
  const cantidad = new Decimal(cantidadUnidades);
  const importe = new Decimal(importeUSD);
  const gastosCUP = new Decimal(gastosPorrateadosCUP);
  const merma = new Decimal(porcentajeMerma);
  const margen = new Decimal(margenUtilidad);
  const tasa = new Decimal(tasaCambio);
  const pctVentaUSD = new Decimal(porcentajeVentaUSD);
  const pctVentaFiscal = new Decimal(porcentajeVentaFiscal);
  const pctVentaEfectivo = new Decimal(porcentajeVentaEfectivo);
  const pctMargenComercial = new Decimal(porcentajeMargenComercial);

  // ============================================
  // CÁLCULO DE COSTOS
  // ============================================

  // Costo unitario base en USD = Importe / Cantidad
  const costoUnitarioUSD = importe.div(cantidad);

  // Gastos prorrateados por unidad en CUP
  const gastosPorUnidadCUP = gastosCUP.div(cantidad);

  // Costo bruto directo por unidad (USD + gastos convertidos a USD)
  const costoBrutoUnitario = costoUnitarioUSD.plus(gastosPorUnidadCUP.div(tasa));

  // Costo unitario en CUP = (Costo USD * Tasa) + Gastos por unidad
  const costoUnitarioCUP = costoUnitarioUSD.mul(tasa).plus(gastosPorUnidadCUP);

  // Costo productos en CUP
  const costoProductosCUP = importe.mul(tasa);

  // ============================================
  // CÁLCULO DE CANTIDADES
  // ============================================

  // Cantidad de merma = Cantidad * (% merma / 100)
  const cantidadMerma = cantidad.mul(merma.div(100));

  // Cantidad vendible = Cantidad - Merma
  const cantidadVendible = cantidad.minus(cantidadMerma);

  // Distribución por canal de venta
  const cantidadVentaUSD = cantidadVendible.mul(pctVentaUSD.div(100));
  const cantidadVentaFiscal = cantidadVendible.mul(pctVentaFiscal.div(100));
  const cantidadVentaEfectivo = cantidadVendible.mul(pctVentaEfectivo.div(100));

  // ============================================
  // CÁLCULO DE PRECIOS DE VENTA
  // ============================================

  // Paso 1: Aplicar margen comercial
  // Precio base = Costo Bruto / (margen comercial / 100)
  // Ejemplo: si margen comercial es 85%, dividimos entre 0.85
  const factorComercial = pctMargenComercial.div(100);
  const precioConMargenComercial = factorComercial.isZero()
    ? costoBrutoUnitario
    : costoBrutoUnitario.div(factorComercial);

  // Paso 2: Aplicar margen de utilidad adicional
  // Precio venta = Precio base * (1 + margenUtilidad / 100)
  // Esto permite que el % Margen Utilidad del contenedor afecte el precio final
  const precioVentaUSD = precioConMargenComercial.mul(
    new Decimal(1).plus(margen.div(100))
  );

  // Precio de venta CUP = Precio USD * Tasa de cambio
  const precioVentaCUP = precioVentaUSD.mul(tasa);

  // Precio Fiscal = mediaPrecioFiscal (valor directo, sin multiplicar por 90%)
  const precioFiscalCUP = new Decimal(mediaPrecioFiscal);
  // Precio Efectivo = mediaPrecioFiscalEfectivo × 90%
  const precioEfectivoCUP = new Decimal(mediaPrecioFiscalEfectivo).mul(new Decimal(0.90));

  // ============================================
  // VENTAS POR CANAL
  // ============================================

  // Venta en USD expresada en CUP
  const ventaUSDEnCUP = cantidadVentaUSD.mul(precioVentaCUP);

  // Venta a cuenta fiscal
  const ventaFiscalCUP = cantidadVentaFiscal.mul(precioFiscalCUP);

  // Venta en efectivo
  const ventaEfectivoCUP = cantidadVentaEfectivo.mul(precioEfectivoCUP);

  // Venta total fiscal (suma de todos los canales)
  const ventaTotalFiscal = ventaUSDEnCUP.plus(ventaFiscalCUP).plus(ventaEfectivoCUP);

  // ============================================
  // ANÁLISIS FINANCIERO BÁSICO
  // ============================================

  // Inversión total = Importe + Gastos/Tasa (convertidos a USD)
  const inversionTotal = importe.plus(gastosCUP.div(tasa));

  // Ventas totales = Precio venta * Cantidad vendible
  const ventasTotalesUSD = precioVentaUSD.mul(cantidadVendible);
  const ventasTotalesCUP = precioVentaCUP.mul(cantidadVendible);

  // Costo total de unidades vendibles
  const costoTotalVendibles = costoUnitarioUSD.mul(cantidadVendible);

  // Utilidad bruta (básica)
  const utilidadBrutaUSD = ventasTotalesUSD.minus(costoTotalVendibles);
  const utilidadBrutaCUP = utilidadBrutaUSD.mul(tasa);

  // Porcentaje de utilidad real
  const porcentajeUtilidad = ventasTotalesUSD.isZero()
    ? new Decimal(0)
    : utilidadBrutaUSD.div(ventasTotalesUSD).mul(100);

  // ============================================
  // COSTOS E IMPUESTOS (NUEVOS)
  // ============================================

  // 1. Primero calcular el 11% de aporte sobre ventas
  const aporte11Porciento = ventaTotalFiscal.mul(new Decimal(0.11));

  // 2. El 11% es deducible como gasto, se incluye en la base para el % de otros gastos
  // Fórmula del Excel: =(CostoProductos + 11%Aporte) / (1 - %OtrosGastos/100) - (CostoProductos + 11%Aporte)
  const costoBaseConAporte = costoProductosCUP.plus(gastosCUP).plus(aporte11Porciento);
  const divisorOtrosGastos = new Decimal(1).minus(new Decimal(porcentajeOtrosGastos).div(100));
  const otrosGastosPorciento = divisorOtrosGastos.isZero()
    ? new Decimal(0)
    : costoBaseConAporte.div(divisorOtrosGastos).minus(costoBaseConAporte);

  // 3. Costo total bruto = Costo + Gastos + 11%Aporte + %OtrosGastos
  const costoTotalBruto = costoBaseConAporte.plus(otrosGastosPorciento);

  // Utilidad estimada = Ventas - Costos
  const utilidadEstimada = ventaTotalFiscal.minus(costoTotalBruto);

  // Porcentaje de utilidad estimada
  const porcentajeUtilidadEstimada = ventaTotalFiscal.isZero()
    ? new Decimal(0)
    : utilidadEstimada.div(ventaTotalFiscal).mul(100);

  // 35% de impuesto sobre utilidad
  const impuesto35Utilidad = utilidadEstimada.mul(new Decimal(0.35));

  // Total de impuestos = 11% + 35%
  const totalImpuestos = aporte11Porciento.plus(impuesto35Utilidad);

  // Carga tributaria = Total Impuestos / Venta Total * 100
  const cargaTributaria = ventaTotalFiscal.isZero()
    ? new Decimal(0)
    : totalImpuestos.div(ventaTotalFiscal).mul(100);

  // Utilidad bruta real = Ventas - Costos - Impuestos
  const utilidadBrutaReal = ventaTotalFiscal.minus(costoTotalBruto).minus(totalImpuestos);

  // ============================================
  // PUNTO DE EQUILIBRIO
  // ============================================

  // Unidades necesarias para recuperar la inversión
  const unidadesParaRecuperar = precioVentaUSD.isZero()
    ? new Decimal(0)
    : inversionTotal.div(precioVentaUSD);

  // Porcentaje de unidades que necesitas vender para recuperar
  const porcentajeUnidadesRecuperar = cantidadVendible.isZero()
    ? new Decimal(0)
    : unidadesParaRecuperar.div(cantidadVendible).mul(100);

  return {
    // Costos
    costoUnitarioUSD,
    costoUnitarioCUP,
    costoBrutoUnitario,
    // Cantidades
    cantidadVendible,
    cantidadMerma,
    cantidadVentaUSD,
    cantidadVentaFiscal,
    cantidadVentaEfectivo,
    // Precios
    precioVentaUSD,
    precioVentaCUP,
    precioFiscalCUP,
    precioEfectivoCUP,
    // Ventas por canal
    ventaUSDEnCUP,
    ventaFiscalCUP,
    ventaEfectivoCUP,
    ventaTotalFiscal,
    // Análisis financiero básico
    inversionTotal,
    ventasTotalesUSD,
    ventasTotalesCUP,
    utilidadBrutaUSD,
    utilidadBrutaCUP,
    porcentajeUtilidad,
    // Costos e impuestos
    costoProductosCUP,
    otrosGastosPorciento,
    costoTotalBruto,
    aporte11Porciento,
    impuesto35Utilidad,
    totalImpuestos,
    cargaTributaria,
    // Utilidad
    utilidadEstimada,
    porcentajeUtilidadEstimada,
    utilidadBrutaReal,
    // Punto de equilibrio
    unidadesParaRecuperar,
    porcentajeUnidadesRecuperar,
  };
}

/**
 * Formatea un Decimal a string con el número de decimales especificado
 */
export function formatDecimal(value: Decimal, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Formatea como moneda USD
 */
export function formatUSD(value: Decimal): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Formatea como moneda CUP
 */
export function formatCUP(value: Decimal): string {
  return `${value.toFixed(2)} CUP`;
}

/**
 * Formatea como porcentaje
 */
export function formatPercent(value: Decimal): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Convierte un resultado de cálculo a objeto serializable para API
 */
export function resultadoToJSON(resultado: ResultadoCalculo) {
  return {
    // Costos
    costoUnitarioUSD: resultado.costoUnitarioUSD.toNumber(),
    costoUnitarioCUP: resultado.costoUnitarioCUP.toNumber(),
    costoBrutoUnitario: resultado.costoBrutoUnitario.toNumber(),
    // Cantidades
    cantidadVendible: resultado.cantidadVendible.toNumber(),
    cantidadMerma: resultado.cantidadMerma.toNumber(),
    cantidadVentaUSD: resultado.cantidadVentaUSD.toNumber(),
    cantidadVentaFiscal: resultado.cantidadVentaFiscal.toNumber(),
    cantidadVentaEfectivo: resultado.cantidadVentaEfectivo.toNumber(),
    // Precios
    precioVentaUSD: resultado.precioVentaUSD.toNumber(),
    precioVentaCUP: resultado.precioVentaCUP.toNumber(),
    precioFiscalCUP: resultado.precioFiscalCUP.toNumber(),
    precioEfectivoCUP: resultado.precioEfectivoCUP.toNumber(),
    // Ventas por canal
    ventaUSDEnCUP: resultado.ventaUSDEnCUP.toNumber(),
    ventaFiscalCUP: resultado.ventaFiscalCUP.toNumber(),
    ventaEfectivoCUP: resultado.ventaEfectivoCUP.toNumber(),
    ventaTotalFiscal: resultado.ventaTotalFiscal.toNumber(),
    // Análisis financiero básico
    inversionTotal: resultado.inversionTotal.toNumber(),
    ventasTotalesUSD: resultado.ventasTotalesUSD.toNumber(),
    ventasTotalesCUP: resultado.ventasTotalesCUP.toNumber(),
    utilidadBrutaUSD: resultado.utilidadBrutaUSD.toNumber(),
    utilidadBrutaCUP: resultado.utilidadBrutaCUP.toNumber(),
    porcentajeUtilidad: resultado.porcentajeUtilidad.toNumber(),
    // Costos e impuestos
    costoProductosCUP: resultado.costoProductosCUP.toNumber(),
    otrosGastosPorciento: resultado.otrosGastosPorciento.toNumber(),
    costoTotalBruto: resultado.costoTotalBruto.toNumber(),
    aporte11Porciento: resultado.aporte11Porciento.toNumber(),
    impuesto35Utilidad: resultado.impuesto35Utilidad.toNumber(),
    totalImpuestos: resultado.totalImpuestos.toNumber(),
    cargaTributaria: resultado.cargaTributaria.toNumber(),
    // Utilidad
    utilidadEstimada: resultado.utilidadEstimada.toNumber(),
    porcentajeUtilidadEstimada: resultado.porcentajeUtilidadEstimada.toNumber(),
    utilidadBrutaReal: resultado.utilidadBrutaReal.toNumber(),
    // Punto de equilibrio
    unidadesParaRecuperar: resultado.unidadesParaRecuperar.toNumber(),
    porcentajeUnidadesRecuperar: resultado.porcentajeUnidadesRecuperar.toNumber(),
  };
}

/**
 * Calcula la proporción de inversión de un producto respecto al total.
 * Usado para prorratear gastos de importación por valor invertido (no por cantidad).
 *
 * Fórmula: Proporción = Importe USD Producto / Total Importe USD
 *
 * @param importeProducto - Importe en USD del producto (precioUnitario * cantidad)
 * @param totalImporte - Suma de todos los importes USD de la importación
 * @returns Proporción como decimal (ej: 0.371 para 37.1%)
 */
export function calcularProporcionInversion(
  importeProducto: Decimal,
  totalImporte: Decimal
): Decimal {
  if (totalImporte.isZero()) return new Decimal(0);
  return importeProducto.div(totalImporte);
}

/**
 * Calcula los gastos prorrateados para un producto basándose en su inversión.
 *
 * @param importeProducto - Importe en USD del producto
 * @param totalImporte - Total de importes USD de todos los productos
 * @param totalGastosCUP - Total de gastos en CUP a prorratear
 * @returns Gastos prorrateados en CUP para este producto
 */
export function calcularGastosProrrateo(
  importeProducto: Decimal,
  totalImporte: Decimal,
  totalGastosCUP: Decimal
): Decimal {
  const proporcion = calcularProporcionInversion(importeProducto, totalImporte);
  return totalGastosCUP.mul(proporcion);
}
