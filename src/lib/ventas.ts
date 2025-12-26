import { prisma } from "./db";
import Decimal from "decimal.js";

// Tipos para el módulo de ventas
export interface TransferenciaInput {
  fecha: Date;
  monto: number;
}

export interface ProductoDistribucion {
  productoId: number;
  porcentaje: number; // 0-100
}

export interface PreciosFIFO {
  productoImportadoId: number;
  importacionId: number;
  fechaImportacion: Date;
  precioUSD: Decimal;
  precioFiscal: Decimal;
  precioEfectivo: Decimal;
  tasaCambioUSD: number;
}

export interface DistribucionProducto {
  productoId: number;
  productoImportadoId: number;
  nombreProducto: string;
  montoAsignado: number;
  unidadesFiscales: number;
  totalUnidades: number;
  unidadesUSD: number;
  unidadesFiscal: number;
  unidadesEfectivo: number;
  precios: PreciosFIFO;
}

export interface LineaVentaPreview {
  fecha: Date;
  productoId: number;
  productoImportadoId: number;
  nombreProducto: string;
  canal: "USD" | "FISCAL" | "EFECTIVO";
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface DistribucionResult {
  totalTransferencias: number;
  totalUnidades: number;
  totalCUP: number;
  distribucionPorProducto: DistribucionProducto[];
  lineasVenta: LineaVentaPreview[];
  diasTransferencia: Date[];
  diasOtros: Date[];
}

// Porcentajes de distribución por canal
const PORCENTAJE_USD = 0.91;
const PORCENTAJE_FISCAL = 0.05;
const PORCENTAJE_EFECTIVO = 0.04;

/**
 * Distribuye cantidad en días con variación aleatoria respetando packs
 * @param cantidad Total de unidades a distribuir
 * @param dias Array de fechas
 * @param pack Tamaño del pack (mínimo de venta)
 * @returns Array de { fecha, cantidad }
 */
function distribuirConVariacion(
  cantidad: number,
  dias: Date[],
  pack: number
): { fecha: Date; cantidad: number }[] {
  if (dias.length === 0) return [];
  if (cantidad === 0) return [];
  if (dias.length === 1) return [{ fecha: dias[0], cantidad }];

  // Calcular packs completos y sueltas
  const packsCompletos = Math.floor(cantidad / pack);
  const sueltas = cantidad % pack;

  // Si no hay suficientes packs para distribuir, poner todo en un día
  if (packsCompletos < dias.length) {
    // Distribuir los packs que hay en los primeros días
    const resultado: { fecha: Date; cantidad: number }[] = [];
    for (let i = 0; i < packsCompletos; i++) {
      resultado.push({ fecha: dias[i], cantidad: pack });
    }
    // Agregar sueltas al último día con packs o al primer día si no hay packs
    if (sueltas > 0) {
      if (resultado.length > 0) {
        resultado[resultado.length - 1].cantidad += sueltas;
      } else {
        resultado.push({ fecha: dias[0], cantidad: sueltas });
      }
    }
    return resultado;
  }

  // Distribuir packs con variación aleatoria (±20%)
  const packsPorDia = packsCompletos / dias.length;
  const variacion = 0.2; // 20% de variación

  const resultado: { fecha: Date; cantidad: number }[] = [];
  let packsRestantes = packsCompletos;

  for (let i = 0; i < dias.length - 1; i++) {
    // Calcular cantidad base con variación aleatoria
    const min = Math.max(1, Math.floor(packsPorDia * (1 - variacion)));
    const max = Math.ceil(packsPorDia * (1 + variacion));
    let packsHoy = Math.floor(Math.random() * (max - min + 1)) + min;

    // No asignar más de lo que queda (dejando al menos 1 para días restantes)
    const diasRestantes = dias.length - i - 1;
    packsHoy = Math.min(packsHoy, packsRestantes - diasRestantes);

    resultado.push({
      fecha: dias[i],
      cantidad: packsHoy * pack
    });
    packsRestantes -= packsHoy;
  }

  // Último día recibe lo que queda
  resultado.push({
    fecha: dias[dias.length - 1],
    cantidad: packsRestantes * pack
  });

  // Agregar sueltas al día con más ventas
  if (sueltas > 0) {
    const diaMaxVentas = resultado.reduce((max, dia) =>
      dia.cantidad > max.cantidad ? dia : max
    );
    diaMaxVentas.cantidad += sueltas;
  }

  return resultado.filter(r => r.cantidad > 0);
}

/**
 * Obtiene la fecha de la importación más antigua para un producto
 * que esté dentro del rango de fechas permitido
 */
async function obtenerFechaImportacionProducto(
  productoId: number,
  fechaFin: Date
): Promise<Date | null> {
  const productoImportado = await prisma.productoImportado.findFirst({
    where: {
      productoId,
      importacion: {
        fecha: { lte: fechaFin }
      }
    },
    orderBy: {
      importacion: { fecha: 'asc' }
    },
    include: {
      importacion: true
    }
  });

  return productoImportado?.importacion.fecha ?? null;
}

/**
 * Obtiene los precios FIFO de un producto (del lote más antiguo con stock)
 */
export async function obtenerPreciosFIFO(
  productoId: number,
  fecha: Date
): Promise<PreciosFIFO | null> {
  // Buscar el producto importado más antiguo que tenga stock disponible
  const productoImportado = await prisma.productoImportado.findFirst({
    where: {
      productoId,
      importacion: {
        fecha: { lte: fecha },
      },
    },
    orderBy: {
      importacion: { fecha: "asc" },
    },
    include: {
      importacion: {
        include: {
          tasasCambio: {
            include: { moneda: true },
          },
        },
      },
      producto: true,
    },
  });

  if (!productoImportado) {
    return null;
  }

  // Obtener tasa de cambio USD
  const tasaUSD = productoImportado.importacion.tasasCambio.find(
    (t) => t.moneda.codigo === "USD"
  );
  const tasaCambioUSD = tasaUSD ? Number(tasaUSD.tasaCambio) : 120;

  // Calcular precios
  const precioUSD = new Decimal(productoImportado.precioVentaUSD || 0).mul(tasaCambioUSD);
  const precioFiscal = new Decimal(productoImportado.mediaPrecioFiscal);
  const precioEfectivo = new Decimal(productoImportado.mediaPrecioFiscalEfectivo).mul(0.9);

  return {
    productoImportadoId: productoImportado.id,
    importacionId: productoImportado.importacionId,
    fechaImportacion: productoImportado.importacion.fecha,
    precioUSD,
    precioFiscal,
    precioEfectivo,
    tasaCambioUSD,
  };
}

/**
 * Calcula el stock de un producto en una fecha específica
 * usando el historial de movimientos de inventario
 */
export async function calcularStockEnFecha(
  productoId: number,
  fecha: Date
): Promise<number> {
  const inventario = await prisma.inventario.findUnique({
    where: { productoId },
    include: {
      movimientos: {
        where: {
          fecha: { lte: fecha }
        }
      }
    }
  });

  if (!inventario) return 0;

  let stock = 0;
  for (const mov of inventario.movimientos) {
    switch (mov.tipo) {
      case "ENTRADA":
      case "AJUSTE_POS":
        stock += mov.cantidad;
        break;
      case "SALIDA":
      case "MERMA":
      case "AJUSTE_NEG":
        stock -= mov.cantidad;
        break;
    }
  }

  return Math.max(0, stock);
}

/**
 * Obtiene los productos con stock disponible
 * Si se proporciona fechaFin, calcula el stock histórico en esa fecha
 */
export async function obtenerProductosConStock(
  fechaFin?: Date
): Promise<{ productoId: number; nombre: string; stock: number }[]> {
  // Si no hay fechaFin, usar el stock actual
  if (!fechaFin) {
    const inventarios = await prisma.inventario.findMany({
      where: {
        cantidadActual: { gt: 0 },
        producto: { activo: true },
      },
      include: {
        producto: true,
      },
    });

    return inventarios.map((inv) => ({
      productoId: inv.productoId,
      nombre: inv.producto.nombre,
      stock: inv.cantidadActual,
    }));
  }

  // Obtener productos activos con importaciones válidas para la fecha
  const productos = await prisma.producto.findMany({
    where: {
      activo: true,
      importaciones: {
        some: {
          importacion: { fecha: { lte: fechaFin } }
        }
      }
    },
    include: {
      inventario: {
        include: {
          movimientos: {
            where: { fecha: { lte: fechaFin } }
          }
        }
      }
    }
  });

  return productos
    .map((p) => {
      // Calcular stock histórico
      let stock = 0;
      if (p.inventario) {
        for (const mov of p.inventario.movimientos) {
          if (mov.tipo === "ENTRADA" || mov.tipo === "AJUSTE_POS") {
            stock += mov.cantidad;
          } else {
            stock -= mov.cantidad;
          }
        }
      }
      return {
        productoId: p.id,
        nombre: p.nombre,
        stock: Math.max(0, stock)
      };
    })
    .filter(p => p.stock > 0);
}

/**
 * Calcula la distribución automática según el stock
 */
export function calcularDistribucionAuto(
  productos: { productoId: number; stock: number }[]
): ProductoDistribucion[] {
  const totalStock = productos.reduce((sum, p) => sum + p.stock, 0);

  if (totalStock === 0) {
    return productos.map((p) => ({
      productoId: p.productoId,
      porcentaje: 100 / productos.length,
    }));
  }

  return productos.map((p) => ({
    productoId: p.productoId,
    porcentaje: (p.stock / totalStock) * 100,
  }));
}

/**
 * Obtiene los días hábiles de un período (Lunes a Sábado)
 */
export function obtenerDiasHabiles(fechaInicio: Date, fechaFin: Date): Date[] {
  const dias: Date[] = [];
  const fecha = new Date(fechaInicio);

  while (fecha <= fechaFin) {
    const diaSemana = fecha.getDay();
    // Lunes (1) a Sábado (6)
    if (diaSemana >= 1 && diaSemana <= 6) {
      dias.push(new Date(fecha));
    }
    fecha.setDate(fecha.getDate() + 1);
  }

  return dias;
}

/**
 * Filtra días hábiles excluyendo los días de transferencia
 */
export function obtenerDiasSinTransferencia(
  diasHabiles: Date[],
  diasTransferencia: Date[]
): Date[] {
  const fechasTransferencia = new Set(
    diasTransferencia.map((d) => d.toISOString().split("T")[0])
  );

  return diasHabiles.filter(
    (d) => !fechasTransferencia.has(d.toISOString().split("T")[0])
  );
}

/**
 * Calcula la distribución completa de ventas
 * @param permitirReasignacionFiscal Si es true, las ventas fiscales se asignan a días hábiles
 *        del producto cuando no hay días de transferencia válidos (fecha transferencia < fecha importación)
 */
export async function calcularDistribucion(
  fechaInicio: Date,
  fechaFin: Date,
  transferencias: TransferenciaInput[],
  productosDistribucion: ProductoDistribucion[],
  modo: "MANUAL" | "AUTO",
  permitirReasignacionFiscal: boolean = false
): Promise<DistribucionResult> {
  // Calcular total de transferencias
  const totalTransferencias = transferencias.reduce((sum, t) => sum + t.monto, 0);

  // Obtener días hábiles
  const diasHabiles = obtenerDiasHabiles(fechaInicio, fechaFin);
  const diasTransferencia = transferencias.map((t) => t.fecha);
  const diasOtros = obtenerDiasSinTransferencia(diasHabiles, diasTransferencia);

  // Si modo AUTO, recalcular distribución
  let distribucion = productosDistribucion;
  if (modo === "AUTO") {
    const productosStock = await obtenerProductosConStock();
    const productosSeleccionados = productosStock.filter((p) =>
      productosDistribucion.some((pd) => pd.productoId === p.productoId)
    );
    distribucion = calcularDistribucionAuto(productosSeleccionados);
  }

  // Normalizar porcentajes a 100%
  const totalPorcentaje = distribucion.reduce((sum, p) => sum + p.porcentaje, 0);
  if (totalPorcentaje !== 100) {
    distribucion = distribucion.map((p) => ({
      ...p,
      porcentaje: (p.porcentaje / totalPorcentaje) * 100,
    }));
  }

  // Calcular distribución por producto
  const distribucionPorProducto: DistribucionProducto[] = [];
  const lineasVenta: LineaVentaPreview[] = [];
  let totalUnidades = 0;
  let totalCUP = 0;

  for (const prod of distribucion) {
    // Obtener precios FIFO
    const precios = await obtenerPreciosFIFO(prod.productoId, fechaFin);
    if (!precios) continue;

    // Obtener producto con pack
    const producto = await prisma.producto.findUnique({
      where: { id: prod.productoId },
    });
    if (!producto) continue;

    // Obtener la fecha de importación de este producto
    const fechaImportacion = await obtenerFechaImportacionProducto(prod.productoId, fechaFin);
    if (!fechaImportacion) continue;

    // Filtrar días hábiles para este producto (solo desde su fecha de importación)
    const diasHabilesProducto = diasHabiles.filter(d => d >= fechaImportacion);
    const diasTransferenciaProducto = diasTransferencia.filter(d => d >= fechaImportacion);
    const diasOtrosProducto = diasOtros.filter(d => d >= fechaImportacion);

    // Si no hay días disponibles para este producto, saltar
    if (diasHabilesProducto.length === 0) continue;

    // Calcular monto asignado a este producto (las transferencias para este producto)
    const montoAsignado = (totalTransferencias * prod.porcentaje) / 100;

    // PASO 1: Calcular el MONTO TOTAL del producto (transferencias = 5% del total)
    const montoTotalProducto = montoAsignado / PORCENTAJE_FISCAL;

    // PASO 2: Distribuir el MONTO por canal (usando los porcentajes)
    const montoUSD = montoTotalProducto * PORCENTAJE_USD;
    const montoFiscal = montoTotalProducto * PORCENTAJE_FISCAL; // = montoAsignado
    const montoEfectivo = montoTotalProducto * PORCENTAJE_EFECTIVO;

    // PASO 3: Calcular UNIDADES dividiendo cada monto por su precio respectivo
    const precioUSDNum = precios.precioUSD.toNumber();
    const precioFiscalNum = precios.precioFiscal.toNumber();
    const precioEfectivoNum = precios.precioEfectivo.toNumber();

    const unidadesUSD = Math.ceil(montoUSD / precioUSDNum);
    const unidadesFiscalFinal = Math.ceil(montoFiscal / precioFiscalNum);
    const unidadesEfectivo = Math.ceil(montoEfectivo / precioEfectivoNum);

    const totalUnidadesProducto = unidadesUSD + unidadesFiscalFinal + unidadesEfectivo;

    distribucionPorProducto.push({
      productoId: prod.productoId,
      productoImportadoId: precios.productoImportadoId,
      nombreProducto: producto.nombre,
      montoAsignado,
      unidadesFiscales: unidadesFiscalFinal,
      totalUnidades: totalUnidadesProducto,
      unidadesUSD,
      unidadesFiscal: unidadesFiscalFinal,
      unidadesEfectivo,
      precios,
    });

    totalUnidades += totalUnidadesProducto;

    // Calcular subtotales
    const subtotalUSD = unidadesUSD * precioUSDNum;
    const subtotalFiscal = unidadesFiscalFinal * precioFiscalNum;
    const subtotalEfectivo = unidadesEfectivo * precioEfectivoNum;
    totalCUP += subtotalUSD + subtotalFiscal + subtotalEfectivo;

    // Obtener el pack del producto (cantidad mínima de venta)
    const pack = producto.pack || 24;

    // Generar líneas de venta por día con distribución variable

    // Determinar días para ventas fiscales
    // Si hay días de transferencia válidos para el producto, usar esos
    // Si no hay pero permitirReasignacionFiscal = true, usar primeros días hábiles del producto
    let diasParaFiscal: Date[] = [];
    if (diasTransferenciaProducto.length > 0) {
      diasParaFiscal = diasTransferenciaProducto;
    } else if (permitirReasignacionFiscal && diasHabilesProducto.length > 0) {
      // Usar los primeros días hábiles del producto (tantos como días de transferencia había originalmente)
      const cantidadDias = Math.max(1, diasTransferencia.length);
      diasParaFiscal = diasHabilesProducto.slice(0, cantidadDias);
    }

    // Distribuir ventas fiscales
    if (diasParaFiscal.length > 0 && unidadesFiscalFinal > 0) {
      const distribucionFiscal = distribuirConVariacion(
        unidadesFiscalFinal,
        diasParaFiscal,
        pack
      );

      for (const { fecha, cantidad } of distribucionFiscal) {
        lineasVenta.push({
          fecha,
          productoId: prod.productoId,
          productoImportadoId: precios.productoImportadoId,
          nombreProducto: producto.nombre,
          canal: "FISCAL",
          cantidad,
          precioUnitario: precios.precioFiscal.toNumber(),
          subtotal: cantidad * precios.precioFiscal.toNumber(),
        });
      }
    }

    // Distribuir ventas USD y Efectivo en días sin transferencia
    if (diasOtrosProducto.length > 0) {
      // Distribuir USD
      const distribucionUSD = distribuirConVariacion(
        unidadesUSD,
        diasOtrosProducto,
        pack
      );

      for (const { fecha, cantidad } of distribucionUSD) {
        lineasVenta.push({
          fecha,
          productoId: prod.productoId,
          productoImportadoId: precios.productoImportadoId,
          nombreProducto: producto.nombre,
          canal: "USD",
          cantidad,
          precioUnitario: precios.precioUSD.toNumber(),
          subtotal: cantidad * precios.precioUSD.toNumber(),
        });
      }

      // Distribuir Efectivo
      const distribucionEfectivo = distribuirConVariacion(
        unidadesEfectivo,
        diasOtrosProducto,
        pack
      );

      for (const { fecha, cantidad } of distribucionEfectivo) {
        lineasVenta.push({
          fecha,
          productoId: prod.productoId,
          productoImportadoId: precios.productoImportadoId,
          nombreProducto: producto.nombre,
          canal: "EFECTIVO",
          cantidad,
          precioUnitario: precios.precioEfectivo.toNumber(),
          subtotal: cantidad * precios.precioEfectivo.toNumber(),
        });
      }
    }
  }

  // Ordenar líneas por fecha y producto
  lineasVenta.sort((a, b) => {
    const fechaCompare = a.fecha.getTime() - b.fecha.getTime();
    if (fechaCompare !== 0) return fechaCompare;
    return a.nombreProducto.localeCompare(b.nombreProducto);
  });

  return {
    totalTransferencias,
    totalUnidades,
    totalCUP,
    distribucionPorProducto,
    lineasVenta,
    diasTransferencia,
    diasOtros,
  };
}

/**
 * Valida que haya stock suficiente para la venta
 * Si se proporciona fechaFin, valida contra el stock histórico en esa fecha
 */
export async function validarStock(
  distribucion: DistribucionProducto[],
  fechaFin?: Date
): Promise<{ valido: boolean; errores: string[] }> {
  const errores: string[] = [];

  for (const prod of distribucion) {
    let stockDisponible: number;

    if (fechaFin) {
      // Usar stock histórico
      stockDisponible = await calcularStockEnFecha(prod.productoId, fechaFin);
    } else {
      // Usar stock actual
      const inventario = await prisma.inventario.findUnique({
        where: { productoId: prod.productoId },
      });
      stockDisponible = inventario?.cantidadActual ?? 0;
    }

    if (stockDisponible === 0) {
      errores.push(`Producto ${prod.nombreProducto}: no tiene inventario`);
      continue;
    }

    if (stockDisponible < prod.totalUnidades) {
      const fechaStr = fechaFin
        ? ` al ${fechaFin.toLocaleDateString("es-ES")}`
        : "";
      errores.push(
        `Producto ${prod.nombreProducto}: stock insuficiente${fechaStr} (disponible: ${stockDisponible}, requerido: ${prod.totalUnidades})`
      );
    }
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * Resultado de validación previa de stock
 */
export interface ValidacionStockResult {
  valido: boolean;
  errores: string[];
  detalles: {
    productoId: number;
    nombre: string;
    stockDisponible: number;
    unidadesNecesarias: number;
    transferenciasCubiertas: number;
    porcentajeAsignado: number;
  }[];
  totalTransferenciasCubiertas: number;
}

/**
 * Obtiene los porcentajes de venta de la importación FIFO de un producto
 */
async function obtenerPorcentajesImportacion(
  productoId: number,
  fechaFin: Date
): Promise<{
  porcentajeVentaUSD: number;
  porcentajeVentaFiscal: number;
  porcentajeVentaEfectivo: number;
} | null> {
  const productoImportado = await prisma.productoImportado.findFirst({
    where: {
      productoId,
      importacion: { fecha: { lte: fechaFin } }
    },
    orderBy: { importacion: { fecha: 'asc' } },
    include: { importacion: true }
  });

  if (!productoImportado) return null;

  return {
    porcentajeVentaUSD: Number(productoImportado.importacion.porcentajeVentaUSD),
    porcentajeVentaFiscal: Number(productoImportado.importacion.porcentajeVentaFiscal),
    porcentajeVentaEfectivo: Number(productoImportado.importacion.porcentajeVentaEfectivo),
  };
}

/**
 * Valida si hay stock suficiente ANTES de calcular la distribución.
 * Esta función debe llamarse antes de "Calcular Distribución".
 *
 * Lógica:
 * 1. Las transferencias = porcentajeVentaFiscal% del MONTO_TOTAL
 * 2. MONTO_TOTAL = transferencias / (porcentajeVentaFiscal / 100)
 * 3. Calcular unidades necesarias por canal con su precio específico
 * 4. Validar que stock >= unidades necesarias
 */
export async function validarStockParaVenta(
  fechaFin: Date,
  totalTransferencias: number,
  productosDistribucion: ProductoDistribucion[]
): Promise<ValidacionStockResult> {
  const errores: string[] = [];
  const detalles: ValidacionStockResult['detalles'] = [];
  let totalTransferenciasCubiertas = 0;

  for (const prod of productosDistribucion) {
    // Obtener datos del producto
    const producto = await prisma.producto.findUnique({
      where: { id: prod.productoId }
    });
    if (!producto) {
      errores.push(`Producto ID ${prod.productoId} no encontrado`);
      continue;
    }

    // Obtener stock disponible a la fecha
    const stockDisponible = await calcularStockEnFecha(prod.productoId, fechaFin);

    // Obtener precios FIFO
    const precios = await obtenerPreciosFIFO(prod.productoId, fechaFin);
    if (!precios) {
      errores.push(`${producto.nombre}: No tiene importaciones disponibles hasta ${fechaFin.toLocaleDateString('es-ES')}`);
      continue;
    }

    // Obtener porcentajes de la importación
    const porcentajes = await obtenerPorcentajesImportacion(prod.productoId, fechaFin);
    if (!porcentajes) {
      errores.push(`${producto.nombre}: No se encontraron porcentajes de la importación`);
      continue;
    }

    const pctUSD = porcentajes.porcentajeVentaUSD / 100;
    const pctFiscal = porcentajes.porcentajeVentaFiscal / 100;
    const pctEfectivo = porcentajes.porcentajeVentaEfectivo / 100;

    // PASO 1: Calcular el MONTO TOTAL a partir de las transferencias asignadas a este producto
    // transferenciaAsignada = totalTransferencias × (porcentaje / 100)
    // MONTO_TOTAL = transferenciaAsignada / pctFiscal
    const transferenciaAsignada = totalTransferencias * (prod.porcentaje / 100);
    const montoTotalProducto = transferenciaAsignada / pctFiscal;

    // PASO 2: Calcular monto por canal
    const montoUSD = montoTotalProducto * pctUSD;
    const montoFiscal = montoTotalProducto * pctFiscal; // = transferenciaAsignada
    const montoEfectivo = montoTotalProducto * pctEfectivo;

    // PASO 3: Calcular unidades necesarias por canal (cada canal tiene su precio)
    const precioUSD = precios.precioUSD.toNumber();
    const precioFiscal = precios.precioFiscal.toNumber();
    const precioEfectivo = precios.precioEfectivo.toNumber();

    const unidadesUSD = precioUSD > 0 ? Math.ceil(montoUSD / precioUSD) : 0;
    const unidadesFiscal = precioFiscal > 0 ? Math.ceil(montoFiscal / precioFiscal) : 0;
    const unidadesEfectivo = precioEfectivo > 0 ? Math.ceil(montoEfectivo / precioEfectivo) : 0;

    // TOTAL DE UNIDADES NECESARIAS
    const unidadesNecesarias = unidadesUSD + unidadesFiscal + unidadesEfectivo;

    // PASO 4: Calcular transferencias que puede cubrir este stock (inverso)
    // Distribuir stock proporcionalmente entre canales
    const stockUSD = stockDisponible * pctUSD;
    const stockFiscal = stockDisponible * pctFiscal;
    const stockEfectivo = stockDisponible * pctEfectivo;

    // Valor generado por cada canal
    const valorUSD = stockUSD * precioUSD;
    const valorFiscal = stockFiscal * precioFiscal;
    const valorEfectivo = stockEfectivo * precioEfectivo;

    // Valor total que puede generar este stock
    const valorTotalStock = valorUSD + valorFiscal + valorEfectivo;

    // Las transferencias cubiertas son pctFiscal% del valor total
    const transferenciasCubiertasProducto = valorTotalStock * pctFiscal;

    // Ajustar por el porcentaje asignado al producto
    const transferenciasCubiertasAjustadas = transferenciasCubiertasProducto;
    totalTransferenciasCubiertas += transferenciasCubiertasAjustadas;

    // Guardar detalles
    detalles.push({
      productoId: prod.productoId,
      nombre: producto.nombre,
      stockDisponible,
      unidadesNecesarias,
      transferenciasCubiertas: transferenciasCubiertasAjustadas,
      porcentajeAsignado: prod.porcentaje
    });

    // Validar stock suficiente
    if (unidadesNecesarias > stockDisponible) {
      errores.push(
        `${producto.nombre}: Stock insuficiente. Requiere ${unidadesNecesarias.toLocaleString('es-ES')} unidades pero solo hay ${stockDisponible.toLocaleString('es-ES')} disponibles`
      );
    }
  }

  // Validar cobertura de liquidez
  if (totalTransferencias > totalTransferenciasCubiertas) {
    errores.push(
      `Liquidez insuficiente: Las transferencias (${totalTransferencias.toLocaleString('es-ES', { style: 'currency', currency: 'CUP' })}) exceden lo que el stock puede cubrir (${totalTransferenciasCubiertas.toLocaleString('es-ES', { style: 'currency', currency: 'CUP' })})`
    );
  }

  return {
    valido: errores.length === 0,
    errores,
    detalles,
    totalTransferenciasCubiertas
  };
}

/**
 * Resultado de validación de fechas de transferencias
 */
export interface ValidacionFechasResult {
  valido: boolean;
  conflictos: {
    transferencia: { fecha: Date; monto: number };
    productosExcluidos: {
      productoId: number;
      nombre: string;
      fechaImportacion: Date;
      motivo: string;
    }[];
  }[];
}

/**
 * Compara dos fechas ignorando la hora (solo año, mes, día)
 * Retorna true si fecha1 > fecha2
 */
function fechaMayorQue(fecha1: Date, fecha2: Date): boolean {
  const f1 = new Date(fecha1);
  const f2 = new Date(fecha2);
  f1.setHours(0, 0, 0, 0);
  f2.setHours(0, 0, 0, 0);
  return f1.getTime() > f2.getTime();
}

/**
 * Valida que las transferencias seleccionadas tengan productos disponibles
 * según la fecha de importación de cada producto.
 *
 * Un producto solo puede vender a partir de su fecha de importación.
 * Si una transferencia es de fecha anterior a la importación, hay conflicto.
 */
export async function validarFechasTransferencias(
  transferencias: TransferenciaInput[],
  productosDistribucion: ProductoDistribucion[],
  fechaFin: Date
): Promise<ValidacionFechasResult> {
  const conflictos: ValidacionFechasResult['conflictos'] = [];

  // Obtener fecha de importación de cada producto
  const productosConFecha: {
    productoId: number;
    nombre: string;
    fechaImportacion: Date;
  }[] = [];

  for (const prod of productosDistribucion) {
    const producto = await prisma.producto.findUnique({
      where: { id: prod.productoId }
    });
    if (!producto) continue;

    const fechaImportacion = await obtenerFechaImportacionProducto(prod.productoId, fechaFin);
    if (!fechaImportacion) continue;

    productosConFecha.push({
      productoId: prod.productoId,
      nombre: producto.nombre,
      fechaImportacion
    });
  }

  // Para cada transferencia, verificar si hay productos que no pueden vender ese día
  for (const transf of transferencias) {
    const productosExcluidos: ValidacionFechasResult['conflictos'][0]['productosExcluidos'] = [];

    for (const prod of productosConFecha) {
      // Si la fecha de importación es posterior a la fecha de transferencia,
      // este producto no puede tener ventas fiscales ese día
      // Usar comparación de fechas sin hora para evitar problemas de timezone
      if (fechaMayorQue(prod.fechaImportacion, transf.fecha)) {
        productosExcluidos.push({
          productoId: prod.productoId,
          nombre: prod.nombre,
          fechaImportacion: prod.fechaImportacion,
          motivo: `La importación de ${prod.nombre} es del ${prod.fechaImportacion.toLocaleDateString('es-ES')}, posterior a la transferencia del ${new Date(transf.fecha).toLocaleDateString('es-ES')}`
        });
      }
    }

    // Si hay productos excluidos para esta transferencia, hay conflicto
    // (antes solo detectaba si TODOS estaban excluidos, ahora detecta si alguno lo está)
    if (productosExcluidos.length > 0) {
      conflictos.push({
        transferencia: { fecha: transf.fecha, monto: transf.monto },
        productosExcluidos
      });
    }
  }

  return {
    valido: conflictos.length === 0,
    conflictos
  };
}

/**
 * Calcula totales por producto y canal
 */
export function calcularTotalesPorProducto(lineas: LineaVentaPreview[]): {
  porProducto: Record<
    number,
    {
      nombre: string;
      usd: { cantidad: number; subtotal: number };
      fiscal: { cantidad: number; subtotal: number };
      efectivo: { cantidad: number; subtotal: number };
      total: { cantidad: number; subtotal: number };
    }
  >;
  totales: {
    usd: { cantidad: number; subtotal: number };
    fiscal: { cantidad: number; subtotal: number };
    efectivo: { cantidad: number; subtotal: number };
    total: { cantidad: number; subtotal: number };
  };
} {
  const porProducto: Record<number, {
    nombre: string;
    usd: { cantidad: number; subtotal: number };
    fiscal: { cantidad: number; subtotal: number };
    efectivo: { cantidad: number; subtotal: number };
    total: { cantidad: number; subtotal: number };
  }> = {};

  for (const linea of lineas) {
    if (!porProducto[linea.productoId]) {
      porProducto[linea.productoId] = {
        nombre: linea.nombreProducto,
        usd: { cantidad: 0, subtotal: 0 },
        fiscal: { cantidad: 0, subtotal: 0 },
        efectivo: { cantidad: 0, subtotal: 0 },
        total: { cantidad: 0, subtotal: 0 },
      };
    }

    const prod = porProducto[linea.productoId];
    const canal = linea.canal.toLowerCase() as "usd" | "fiscal" | "efectivo";
    prod[canal].cantidad += linea.cantidad;
    prod[canal].subtotal += linea.subtotal;
    prod.total.cantidad += linea.cantidad;
    prod.total.subtotal += linea.subtotal;
  }

  // Calcular totales generales
  const totales = {
    usd: { cantidad: 0, subtotal: 0 },
    fiscal: { cantidad: 0, subtotal: 0 },
    efectivo: { cantidad: 0, subtotal: 0 },
    total: { cantidad: 0, subtotal: 0 },
  };

  for (const prod of Object.values(porProducto)) {
    totales.usd.cantidad += prod.usd.cantidad;
    totales.usd.subtotal += prod.usd.subtotal;
    totales.fiscal.cantidad += prod.fiscal.cantidad;
    totales.fiscal.subtotal += prod.fiscal.subtotal;
    totales.efectivo.cantidad += prod.efectivo.cantidad;
    totales.efectivo.subtotal += prod.efectivo.subtotal;
    totales.total.cantidad += prod.total.cantidad;
    totales.total.subtotal += prod.total.subtotal;
  }

  return { porProducto, totales };
}

/**
 * Resultado del cálculo de porcentaje máximo
 */
export interface PorcentajeMaximoResult {
  porcentajeMaximo: number;
  stockDisponible: number;
  unidadesMaximas: number;
  transferenciaMaxima: number;
}

/**
 * Calcula el porcentaje máximo que un producto puede cubrir
 * basado en su stock disponible vs el monto de transferencias
 */
export async function calcularPorcentajeMaximo(
  productoId: number,
  fechaFin: Date,
  totalTransferencias: number
): Promise<PorcentajeMaximoResult> {
  // 1. Obtener stock del producto a la fecha
  const stockDisponible = await calcularStockEnFecha(productoId, fechaFin);

  // 2. Obtener precios FIFO
  const precios = await obtenerPreciosFIFO(productoId, fechaFin);
  if (!precios || stockDisponible === 0) {
    return {
      porcentajeMaximo: 0,
      stockDisponible: 0,
      unidadesMaximas: 0,
      transferenciaMaxima: 0,
    };
  }

  // 3. Calcular valor total que puede generar este stock
  // Distribuir stock proporcionalmente entre canales
  const stockUSD = stockDisponible * PORCENTAJE_USD;
  const stockFiscal = stockDisponible * PORCENTAJE_FISCAL;
  const stockEfectivo = stockDisponible * PORCENTAJE_EFECTIVO;

  const valorTotal =
    stockUSD * precios.precioUSD.toNumber() +
    stockFiscal * precios.precioFiscal.toNumber() +
    stockEfectivo * precios.precioEfectivo.toNumber();

  // 4. Las transferencias cubiertas son 5% del valor total
  const transferenciaMaxima = valorTotal * PORCENTAJE_FISCAL;

  // 5. Calcular porcentaje máximo
  const porcentajeMaximo =
    totalTransferencias > 0
      ? Math.min(100, (transferenciaMaxima / totalTransferencias) * 100)
      : 100;

  return {
    porcentajeMaximo: Math.floor(porcentajeMaximo * 100) / 100, // Redondear a 2 decimales
    stockDisponible,
    unidadesMaximas: stockDisponible,
    transferenciaMaxima,
  };
}
