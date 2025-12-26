import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import { calcularPrecios, resultadoToJSON } from "@/lib/calculations";
import { recalcularImportacionPorId } from "@/lib/recalcular";
import { z } from "zod";

// Schema de validación para actualizar porcentajes
const actualizarPorcentajesSchema = z.object({
  porcentajeVentaUSD: z.number().min(0).max(100),
  porcentajeVentaFiscal: z.number().min(0).max(100),
  porcentajeVentaEfectivo: z.number().min(0).max(100),
  porcentajeMerma: z.number().min(0).max(100),
  porcentajeMargenUtilidad: z.number().min(0).max(100),
  porcentajeAporteMasMargen: z.number().min(0).max(100),
  porcentajeMargenComercial: z.number().min(0).max(100),
  porcentajeOtrosGastos: z.number().min(0).max(100),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/importaciones/[id] - Obtener importación por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const importacionId = parseInt(id);

    if (isNaN(importacionId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const importacion = await prisma.importacion.findUnique({
      where: { id: importacionId },
      include: {
        importadora: true,
        proveedor: true,
        productos: {
          include: {
            producto: true,
          },
        },
        gastos: {
          include: {
            tipoGasto: true,
            moneda: true,
          },
        },
        tasasCambio: {
          include: {
            moneda: true,
          },
        },
      },
    });

    if (!importacion) {
      return NextResponse.json(
        { error: "Importación no encontrada" },
        { status: 404 }
      );
    }

    // Obtener tasa de cambio USD (buscar en tasas del contenedor o usar defecto)
    const tasaUSD = importacion.tasasCambio.find(
      (t) => t.moneda.codigo === "USD"
    );
    const tasaCambioUSD = tasaUSD ? Number(tasaUSD.tasaCambio) : 320;

    // Calcular total de gastos en CUP
    let totalGastosCUP = 0;
    for (const gasto of importacion.gastos) {
      const tasaGasto = importacion.tasasCambio.find(
        (t) => t.monedaId === gasto.monedaId
      );
      const tasaMoneda = tasaGasto
        ? Number(tasaGasto.tasaCambio)
        : Number(gasto.moneda.tasaDefecto);
      totalGastosCUP += Number(gasto.monto) * tasaMoneda;
    }

    // Calcular total de unidades (para info general)
    const totalUnidades = importacion.productos.reduce(
      (sum, p) => sum + p.cantidadUnidades,
      0
    );

    // Calcular total de importe USD para prorrateo por inversión (no por cantidad)
    const totalImporteUSD = importacion.productos.reduce(
      (sum, p) => sum + Number(p.importeUSD),
      0
    );

    // Calcular precios para cada producto
    const productosConCalculo = importacion.productos.map((p) => {
      // Prorratear gastos por inversión (% que representa del total de la factura)
      const importeProducto = Number(p.importeUSD);
      const proporcion = totalImporteUSD > 0 ? importeProducto / totalImporteUSD : 0;
      const gastosPorrateados = totalGastosCUP * proporcion;
      const porcentajeFactura = proporcion * 100; // Para mostrar en UI

      const calculos = calcularPrecios({
        cantidadUnidades: p.cantidadUnidades,
        importeUSD: Number(p.importeUSD),
        gastosPorrateadosCUP: gastosPorrateados,
        porcentajeMerma: Number(importacion.porcentajeMerma),
        margenUtilidad: Number(importacion.porcentajeMargenUtilidad),
        tasaCambio: tasaCambioUSD,
        // Parámetros de Leyenda desde el contenedor
        porcentajeVentaUSD: Number(importacion.porcentajeVentaUSD),
        porcentajeVentaFiscal: Number(importacion.porcentajeVentaFiscal),
        porcentajeVentaEfectivo: Number(importacion.porcentajeVentaEfectivo),
        porcentajeMargenComercial: Number(importacion.porcentajeMargenComercial),
        porcentajeOtrosGastos: Number(importacion.porcentajeOtrosGastos),
        // Media de precios fiscales desde el producto
        mediaPrecioFiscal: Number(p.mediaPrecioFiscal),
        mediaPrecioFiscalEfectivo: Number(p.mediaPrecioFiscalEfectivo),
      });

      return {
        ...p,
        gastosPorrateadosCUP: gastosPorrateados,
        porcentajeFactura, // % que representa este producto del total de la factura
        calculos: resultadoToJSON(calculos),
      };
    });

    const totalUSD = importacion.productos.reduce(
      (sum, p) => sum + Number(p.importeUSD),
      0
    );

    // Calcular totales consolidados del contenedor
    const totalesContenedor = productosConCalculo.reduce(
      (acc, p) => {
        const c = p.calculos;
        return {
          // Cantidades
          cantidadVendible: acc.cantidadVendible + c.cantidadVendible,
          cantidadMerma: acc.cantidadMerma + c.cantidadMerma,
          cantidadVentaUSD: acc.cantidadVentaUSD + c.cantidadVentaUSD,
          cantidadVentaFiscal: acc.cantidadVentaFiscal + c.cantidadVentaFiscal,
          cantidadVentaEfectivo: acc.cantidadVentaEfectivo + c.cantidadVentaEfectivo,
          // Ventas por canal
          ventaUSDEnCUP: acc.ventaUSDEnCUP + c.ventaUSDEnCUP,
          ventaFiscalCUP: acc.ventaFiscalCUP + c.ventaFiscalCUP,
          ventaEfectivoCUP: acc.ventaEfectivoCUP + c.ventaEfectivoCUP,
          ventaTotalFiscal: acc.ventaTotalFiscal + c.ventaTotalFiscal,
          // Costos
          costoProductosCUP: acc.costoProductosCUP + c.costoProductosCUP,
          otrosGastosPorciento: acc.otrosGastosPorciento + c.otrosGastosPorciento,
          costoTotalBruto: acc.costoTotalBruto + c.costoTotalBruto,
          // Impuestos
          aporte11Porciento: acc.aporte11Porciento + c.aporte11Porciento,
          impuesto35Utilidad: acc.impuesto35Utilidad + c.impuesto35Utilidad,
          totalImpuestos: acc.totalImpuestos + c.totalImpuestos,
          // Utilidad
          utilidadEstimada: acc.utilidadEstimada + c.utilidadEstimada,
          utilidadBrutaReal: acc.utilidadBrutaReal + c.utilidadBrutaReal,
          inversionTotal: acc.inversionTotal + c.inversionTotal,
        };
      },
      {
        cantidadVendible: 0, cantidadMerma: 0, cantidadVentaUSD: 0,
        cantidadVentaFiscal: 0, cantidadVentaEfectivo: 0,
        ventaUSDEnCUP: 0, ventaFiscalCUP: 0, ventaEfectivoCUP: 0, ventaTotalFiscal: 0,
        costoProductosCUP: 0, otrosGastosPorciento: 0, costoTotalBruto: 0,
        aporte11Porciento: 0, impuesto35Utilidad: 0, totalImpuestos: 0,
        utilidadEstimada: 0, utilidadBrutaReal: 0, inversionTotal: 0,
      }
    );

    // Calcular porcentajes consolidados
    const cargaTributaria = totalesContenedor.ventaTotalFiscal > 0
      ? (totalesContenedor.totalImpuestos / totalesContenedor.ventaTotalFiscal) * 100
      : 0;
    const porcentajeUtilidadEstimada = totalesContenedor.ventaTotalFiscal > 0
      ? (totalesContenedor.utilidadEstimada / totalesContenedor.ventaTotalFiscal) * 100
      : 0;

    // Calcular venta real estimada total
    const totalVentaRealEstimada = importacion.productos.reduce(
      (sum, p) => sum + (p.ventaRealEstimada ? Number(p.ventaRealEstimada) : 0),
      0
    );

    return NextResponse.json({
      ...importacion,
      productos: productosConCalculo,
      totales: {
        totalUSD,
        totalImporteUSD, // Para calcular % de factura
        totalUnidades,
        totalGastosCUP,
        tasaCambioUSD,
        cantidadProductos: importacion.productos.length,
      },
      totalesContenedor: {
        ...totalesContenedor,
        cargaTributaria,
        porcentajeUtilidadEstimada,
        totalVentaRealEstimada,
      },
      porcentajes: {
        porcentajeVentaUSD: Number(importacion.porcentajeVentaUSD),
        porcentajeVentaFiscal: Number(importacion.porcentajeVentaFiscal),
        porcentajeVentaEfectivo: Number(importacion.porcentajeVentaEfectivo),
        porcentajeMargenComercial: Number(importacion.porcentajeMargenComercial),
        porcentajeMerma: Number(importacion.porcentajeMerma),
        porcentajeMargenUtilidad: Number(importacion.porcentajeMargenUtilidad),
        porcentajeAporteMasMargen: Number(importacion.porcentajeAporteMasMargen),
        porcentajeOtrosGastos: Number(importacion.porcentajeOtrosGastos),
      },
    });
  } catch (error) {
    console.error("Error al obtener importación:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al obtener importación" },
      { status: 500 }
    );
  }
}

// DELETE /api/importaciones/[id] - Eliminar importación
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const importacionId = parseInt(id);

    if (isNaN(importacionId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Obtener productos de la importación para revertir inventario
    const importacion = await prisma.importacion.findUnique({
      where: { id: importacionId },
      include: {
        productos: true,
      },
    });

    if (!importacion) {
      return NextResponse.json(
        { error: "Importación no encontrada" },
        { status: 404 }
      );
    }

    // Eliminar en transacción
    await prisma.$transaction(async (tx) => {
      // Revertir inventario para cada producto
      for (const prod of importacion.productos) {
        const inventario = await tx.inventario.findUnique({
          where: { productoId: prod.productoId },
        });

        if (inventario) {
          // Decrementar stock
          await tx.inventario.update({
            where: { id: inventario.id },
            data: {
              cantidadActual: {
                decrement: prod.cantidadUnidades,
              },
            },
          });

          // Registrar ajuste negativo
          await tx.movimientoInventario.create({
            data: {
              inventarioId: inventario.id,
              tipo: "AJUSTE_NEG",
              cantidad: prod.cantidadUnidades,
              motivo: "Eliminación de importación",
              referencia: `Importación #${importacionId} eliminada`,
            },
          });
        }
      }

      // Eliminar importación (cascade elimina productos importados)
      await tx.importacion.delete({
        where: { id: importacionId },
      });
    });

    return NextResponse.json({ message: "Importación eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar importación:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al eliminar importación" },
      { status: 500 }
    );
  }
}

// PATCH /api/importaciones/[id] - Actualizar porcentajes y recalcular productos
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const importacionId = parseInt(id);

    if (isNaN(importacionId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();

    // Validar datos de entrada
    const validacion = actualizarPorcentajesSchema.safeParse(body);
    if (!validacion.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: validacion.error.issues },
        { status: 400 }
      );
    }

    const porcentajes = validacion.data;

    // Validar que los porcentajes de venta sumen 100
    const sumaVentas = porcentajes.porcentajeVentaUSD +
                       porcentajes.porcentajeVentaFiscal +
                       porcentajes.porcentajeVentaEfectivo;
    if (Math.abs(sumaVentas - 100) > 0.01) {
      return NextResponse.json(
        { error: "Los porcentajes de venta deben sumar 100%" },
        { status: 400 }
      );
    }

    // Verificar que la importación existe
    const importacionExiste = await prisma.importacion.findUnique({
      where: { id: importacionId },
    });

    if (!importacionExiste) {
      return NextResponse.json(
        { error: "Importación no encontrada" },
        { status: 404 }
      );
    }

    // Actualizar en transacción
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar porcentajes de la importación
      await tx.importacion.update({
        where: { id: importacionId },
        data: {
          porcentajeVentaUSD: porcentajes.porcentajeVentaUSD,
          porcentajeVentaFiscal: porcentajes.porcentajeVentaFiscal,
          porcentajeVentaEfectivo: porcentajes.porcentajeVentaEfectivo,
          porcentajeMerma: porcentajes.porcentajeMerma,
          porcentajeMargenUtilidad: porcentajes.porcentajeMargenUtilidad,
          porcentajeAporteMasMargen: porcentajes.porcentajeAporteMasMargen,
          porcentajeMargenComercial: porcentajes.porcentajeMargenComercial,
          porcentajeOtrosGastos: porcentajes.porcentajeOtrosGastos,
        },
      });

      // 2. Recalcular todos los productos usando la función centralizada
      await recalcularImportacionPorId(tx, importacionId);
    });

    return NextResponse.json({
      message: "Porcentajes actualizados correctamente",
      porcentajes
    });
  } catch (error) {
    console.error("Error al actualizar porcentajes:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al actualizar porcentajes" },
      { status: 500 }
    );
  }
}
