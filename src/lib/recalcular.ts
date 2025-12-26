import { Prisma } from "@prisma/client";
import { calcularPrecios } from "./calculations";

// Tipo para transacción de Prisma
type PrismaTransaction = Omit<
  typeof import("@prisma/client").PrismaClient.prototype,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Interfaz para los datos mínimos necesarios de un gasto
 */
interface GastoData {
  monedaId: number;
  monto: Prisma.Decimal | number | string;
  moneda: {
    tasaDefecto: Prisma.Decimal | number | string;
  };
}

/**
 * Interfaz para los datos mínimos necesarios de una tasa de cambio
 */
interface TasaCambioData {
  monedaId: number;
  tasaCambio: Prisma.Decimal | number | string;
  moneda: {
    codigo: string;
  };
}

/**
 * Interfaz para los datos mínimos necesarios de un producto importado
 */
interface ProductoImportadoData {
  id: number;
  cantidadUnidades: number;
  importeUSD: Prisma.Decimal | number | string;
  porcentajeMerma: Prisma.Decimal | number | string;
  margenUtilidad: Prisma.Decimal | number | string;
  mediaPrecioFiscal: Prisma.Decimal | number | string;
  mediaPrecioFiscalEfectivo: Prisma.Decimal | number | string;
}

/**
 * Interfaz para los datos mínimos necesarios de una importación
 */
interface ImportacionData {
  porcentajeVentaUSD: Prisma.Decimal | number | string;
  porcentajeVentaFiscal: Prisma.Decimal | number | string;
  porcentajeVentaEfectivo: Prisma.Decimal | number | string;
  porcentajeMargenComercial: Prisma.Decimal | number | string;
  porcentajeOtrosGastos: Prisma.Decimal | number | string;
  porcentajeMerma: Prisma.Decimal | number | string;
  porcentajeMargenUtilidad: Prisma.Decimal | number | string;
  porcentajeAporteMasMargen: Prisma.Decimal | number | string;
  productos: ProductoImportadoData[];
  gastos: GastoData[];
  tasasCambio: TasaCambioData[];
}

/**
 * Calcula el total de gastos en CUP usando las tasas del contenedor
 */
export function calcularTotalGastosCUP(
  gastos: GastoData[],
  tasasCambio: TasaCambioData[]
): number {
  let totalGastosCUP = 0;
  for (const gasto of gastos) {
    const tasaGasto = tasasCambio.find((t) => t.monedaId === gasto.monedaId);
    const tasaMoneda = tasaGasto
      ? Number(tasaGasto.tasaCambio)
      : Number(gasto.moneda.tasaDefecto);
    totalGastosCUP += Number(gasto.monto) * tasaMoneda;
  }
  return totalGastosCUP;
}

/**
 * Obtiene la tasa de cambio USD del contenedor
 */
export function obtenerTasaUSD(tasasCambio: TasaCambioData[]): number {
  const tasaUSD = tasasCambio.find((t) => t.moneda.codigo === "USD");
  return tasaUSD ? Number(tasaUSD.tasaCambio) : 320;
}

/**
 * Recalcula todos los productos de una importación y actualiza sus valores calculados.
 * Usa prorrateo por inversión (porcentaje del importe USD total).
 *
 * @param tx - Transacción de Prisma (o cliente normal)
 * @param importacion - Datos de la importación con productos, gastos y tasas
 */
export async function recalcularProductosImportacion(
  tx: PrismaTransaction,
  importacion: ImportacionData
): Promise<void> {
  // Obtener tasa de cambio USD
  const tasaCambioUSD = obtenerTasaUSD(importacion.tasasCambio);

  // Calcular total de gastos en CUP
  const totalGastosCUP = calcularTotalGastosCUP(
    importacion.gastos,
    importacion.tasasCambio
  );

  // Calcular total de importe USD para prorrateo por inversión (NO por cantidad)
  const totalImporteUSD = importacion.productos.reduce(
    (sum, p) => sum + Number(p.importeUSD),
    0
  );

  // Recalcular cada producto
  for (const producto of importacion.productos) {
    // Prorratear gastos por inversión (% que representa del total de la factura)
    const importeProducto = Number(producto.importeUSD);
    const proporcion = totalImporteUSD > 0 ? importeProducto / totalImporteUSD : 0;
    const gastosPorrateados = totalGastosCUP * proporcion;

    // Usar porcentajes GLOBALES de la importación (no del producto individual)
    const porcentajeMermaGlobal = Number(importacion.porcentajeMerma);
    const margenUtilidadGlobal = Number(importacion.porcentajeMargenUtilidad);

    // Calcular precios con todos los parámetros
    const calculos = calcularPrecios({
      cantidadUnidades: producto.cantidadUnidades,
      importeUSD: importeProducto,
      gastosPorrateadosCUP: gastosPorrateados,
      porcentajeMerma: porcentajeMermaGlobal,
      margenUtilidad: margenUtilidadGlobal,
      tasaCambio: tasaCambioUSD,
      // Parámetros de Leyenda desde el contenedor
      porcentajeVentaUSD: Number(importacion.porcentajeVentaUSD),
      porcentajeVentaFiscal: Number(importacion.porcentajeVentaFiscal),
      porcentajeVentaEfectivo: Number(importacion.porcentajeVentaEfectivo),
      porcentajeMargenComercial: Number(importacion.porcentajeMargenComercial),
      porcentajeOtrosGastos: Number(importacion.porcentajeOtrosGastos),
      // Media de precios fiscales desde el producto
      mediaPrecioFiscal: Number(producto.mediaPrecioFiscal),
      mediaPrecioFiscalEfectivo: Number(producto.mediaPrecioFiscalEfectivo),
    });

    // Actualizar el producto con los nuevos valores calculados y los porcentajes globales
    await (tx as any).productoImportado.update({
      where: { id: producto.id },
      data: {
        porcentajeMerma: porcentajeMermaGlobal,
        margenUtilidad: Number(importacion.porcentajeAporteMasMargen),
        costoUnitarioUSD: calculos.costoUnitarioUSD.toNumber(),
        precioVentaUSD: calculos.precioVentaUSD.toNumber(),
        precioVentaCUP: calculos.precioVentaCUP.toNumber(),
      },
    });
  }
}

/**
 * Obtiene una importación con todos los datos necesarios para recalcular
 */
export async function obtenerImportacionParaRecalculo(
  tx: PrismaTransaction,
  importacionId: number
): Promise<ImportacionData | null> {
  return await (tx as any).importacion.findUnique({
    where: { id: importacionId },
    include: {
      productos: true,
      gastos: {
        include: { moneda: true },
      },
      tasasCambio: {
        include: { moneda: true },
      },
    },
  });
}

/**
 * Función de alto nivel que obtiene la importación y recalcula todos sus productos.
 * Útil cuando solo tienes el ID de la importación.
 */
export async function recalcularImportacionPorId(
  tx: PrismaTransaction,
  importacionId: number
): Promise<void> {
  const importacion = await obtenerImportacionParaRecalculo(tx, importacionId);

  if (!importacion) {
    throw new Error(`Importación ${importacionId} no encontrada`);
  }

  await recalcularProductosImportacion(tx, importacion);
}
