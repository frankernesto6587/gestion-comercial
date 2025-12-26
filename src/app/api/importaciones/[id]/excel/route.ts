import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import { calcularPrecios, resultadoToJSON } from "@/lib/calculations";
import * as XLSX from "xlsx";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/importaciones/[id]/excel - Exportar importación a Excel
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

    // Obtener tasa de cambio USD
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

    // Calcular total de importe USD para prorrateo
    const totalImporteUSD = importacion.productos.reduce(
      (sum, p) => sum + Number(p.importeUSD),
      0
    );

    // Calcular total de unidades
    const totalUnidades = importacion.productos.reduce(
      (sum, p) => sum + p.cantidadUnidades,
      0
    );

    // Calcular precios para cada producto
    const productosConCalculo = importacion.productos.map((p) => {
      const importeProducto = Number(p.importeUSD);
      const proporcion = totalImporteUSD > 0 ? importeProducto / totalImporteUSD : 0;
      const gastosPorrateados = totalGastosCUP * proporcion;

      const calculos = calcularPrecios({
        cantidadUnidades: p.cantidadUnidades,
        importeUSD: Number(p.importeUSD),
        gastosPorrateadosCUP: gastosPorrateados,
        porcentajeMerma: Number(p.porcentajeMerma),
        margenUtilidad: Number(p.margenUtilidad),
        tasaCambio: tasaCambioUSD,
        porcentajeVentaUSD: Number(importacion.porcentajeVentaUSD),
        porcentajeVentaFiscal: Number(importacion.porcentajeVentaFiscal),
        porcentajeVentaEfectivo: Number(importacion.porcentajeVentaEfectivo),
        porcentajeMargenComercial: Number(importacion.porcentajeMargenComercial),
        mediaPrecioFiscal: Number(p.mediaPrecioFiscal),
        mediaPrecioFiscalEfectivo: Number(p.mediaPrecioFiscalEfectivo),
      });

      return {
        ...p,
        gastosPorrateados,
        calculos: resultadoToJSON(calculos),
      };
    });

    // Calcular totales consolidados
    const totalesContenedor = productosConCalculo.reduce(
      (acc, p) => {
        const c = p.calculos;
        return {
          cantidadVendible: acc.cantidadVendible + c.cantidadVendible,
          cantidadMerma: acc.cantidadMerma + c.cantidadMerma,
          cantidadVentaUSD: acc.cantidadVentaUSD + c.cantidadVentaUSD,
          cantidadVentaFiscal: acc.cantidadVentaFiscal + c.cantidadVentaFiscal,
          cantidadVentaEfectivo: acc.cantidadVentaEfectivo + c.cantidadVentaEfectivo,
          ventaUSDEnCUP: acc.ventaUSDEnCUP + c.ventaUSDEnCUP,
          ventaFiscalCUP: acc.ventaFiscalCUP + c.ventaFiscalCUP,
          ventaEfectivoCUP: acc.ventaEfectivoCUP + c.ventaEfectivoCUP,
          ventaTotalFiscal: acc.ventaTotalFiscal + c.ventaTotalFiscal,
          costoProductosCUP: acc.costoProductosCUP + c.costoProductosCUP,
          otrosGastosPorciento: acc.otrosGastosPorciento + c.otrosGastosPorciento,
          costoTotalBruto: acc.costoTotalBruto + c.costoTotalBruto,
          aporte11Porciento: acc.aporte11Porciento + c.aporte11Porciento,
          impuesto35Utilidad: acc.impuesto35Utilidad + c.impuesto35Utilidad,
          totalImpuestos: acc.totalImpuestos + c.totalImpuestos,
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

    const cargaTributaria = totalesContenedor.ventaTotalFiscal > 0
      ? (totalesContenedor.totalImpuestos / totalesContenedor.ventaTotalFiscal) * 100
      : 0;
    const porcentajeUtilidadEstimada = totalesContenedor.ventaTotalFiscal > 0
      ? (totalesContenedor.utilidadEstimada / totalesContenedor.ventaTotalFiscal) * 100
      : 0;

    // ========================================
    // CONSTRUIR EXCEL
    // ========================================
    const wb = XLSX.utils.book_new();
    const sheetData: (string | number | null)[][] = [];

    // --- ENCABEZADO ---
    sheetData.push([`IMPORTACIÓN #${importacion.id}`]);
    sheetData.push([`Contenedor: ${importacion.numeroContenedor || "Sin contenedor"}`]);
    sheetData.push([`Fecha: ${formatDate(importacion.fecha)}`]);
    sheetData.push([`Importadora: ${importacion.importadora?.nombre || "-"}`]);
    sheetData.push([`Proveedor: ${importacion.proveedor?.nombre || "-"}`]);
    if (importacion.observaciones) {
      sheetData.push([`Observaciones: ${importacion.observaciones}`]);
    }
    sheetData.push([]); // Línea vacía

    // --- PORCENTAJES DE CÁLCULO ---
    sheetData.push(["PORCENTAJES DE CÁLCULO"]);
    sheetData.push([
      "% Venta USD", Number(importacion.porcentajeVentaUSD),
      "% Venta Fiscal", Number(importacion.porcentajeVentaFiscal),
      "% Venta Efectivo", Number(importacion.porcentajeVentaEfectivo),
    ]);
    sheetData.push([
      "% Merma", Number(importacion.porcentajeMerma),
      "% Margen Utilidad", Number(importacion.porcentajeMargenUtilidad),
      "% Margen Comercial", Number(importacion.porcentajeMargenComercial),
    ]);
    sheetData.push([]); // Línea vacía

    // --- PRODUCTOS ---
    sheetData.push(["PRODUCTOS IMPORTADOS"]);

    // Headers de productos
    const productosHeaders = [
      "Producto",
      "Cantidad",
      "Importe USD",
      "% Merma",
      "% Margen",
      "Media Fiscal",
      "Media Efectivo",
      "Venta Real Est.",
      "Cant. Vendible",
      "Gastos Prorr.",
      "Costo Unit. USD",
      "Costo Unit. CUP",
      "Precio USD",
      "Precio CUP",
      "Precio Fiscal",
      "Precio Efectivo",
      "Venta USD (CUP)",
      "Venta Fiscal",
      "Venta Efectivo",
      "Costo Total",
      "Aporte 11%",
      "Impuesto 35%",
      "Utilidad Est.",
      "% Utilidad",
    ];
    sheetData.push(productosHeaders);

    // Filas de productos
    for (const p of productosConCalculo) {
      const c = p.calculos;
      sheetData.push([
        p.producto.nombre,
        p.cantidadUnidades,
        Number(p.importeUSD),
        Number(p.porcentajeMerma),
        Number(p.margenUtilidad),
        Number(p.mediaPrecioFiscal),
        Number(p.mediaPrecioFiscalEfectivo),
        p.ventaRealEstimada ? Number(p.ventaRealEstimada) : null,
        c.cantidadVendible,
        p.gastosPorrateados,
        c.costoUnitarioUSD,
        c.costoUnitarioCUP,
        c.precioVentaUSD,
        c.precioVentaCUP,
        c.precioFiscalCUP,
        c.precioEfectivoCUP,
        c.ventaUSDEnCUP,
        c.ventaFiscalCUP,
        c.ventaEfectivoCUP,
        c.costoTotalBruto,
        c.aporte11Porciento,
        c.impuesto35Utilidad,
        c.utilidadEstimada,
        c.porcentajeUtilidadEstimada,
      ]);
    }

    // Fila de totales de productos
    sheetData.push([
      "TOTAL",
      totalUnidades,
      totalImporteUSD,
      "", "", "", "", "",
      totalesContenedor.cantidadVendible,
      totalGastosCUP,
      "", "",
      "", "", "", "",
      totalesContenedor.ventaUSDEnCUP,
      totalesContenedor.ventaFiscalCUP,
      totalesContenedor.ventaEfectivoCUP,
      totalesContenedor.costoTotalBruto,
      totalesContenedor.aporte11Porciento,
      totalesContenedor.impuesto35Utilidad,
      totalesContenedor.utilidadEstimada,
      porcentajeUtilidadEstimada,
    ]);

    sheetData.push([]); // Línea vacía

    // --- GASTOS DEL CONTENEDOR ---
    sheetData.push(["GASTOS DEL CONTENEDOR"]);
    sheetData.push(["Tipo de Gasto", "Monto", "Moneda", "Descripción", "Monto CUP"]);

    for (const gasto of importacion.gastos) {
      const tasaGasto = importacion.tasasCambio.find(
        (t) => t.monedaId === gasto.monedaId
      );
      const tasaMoneda = tasaGasto
        ? Number(tasaGasto.tasaCambio)
        : Number(gasto.moneda.tasaDefecto);
      const montoCUP = Number(gasto.monto) * tasaMoneda;

      sheetData.push([
        gasto.tipoGasto.nombre,
        Number(gasto.monto),
        gasto.moneda.codigo,
        gasto.descripcion || "-",
        montoCUP,
      ]);
    }
    sheetData.push(["TOTAL GASTOS CUP", totalGastosCUP, "", "", totalGastosCUP]);
    sheetData.push([]); // Línea vacía

    // --- RESUMEN FINANCIERO ---
    sheetData.push(["RESUMEN FINANCIERO"]);
    sheetData.push([]);

    // Inversión
    sheetData.push(["INVERSIÓN"]);
    sheetData.push(["Total Importe USD", totalImporteUSD]);
    sheetData.push(["Total Importe CUP", totalImporteUSD * tasaCambioUSD]);
    sheetData.push(["Total Gastos CUP", totalGastosCUP]);
    sheetData.push(["Tasa Cambio USD", tasaCambioUSD]);
    sheetData.push([]);

    // Distribución de Ventas
    sheetData.push(["DISTRIBUCIÓN DE VENTAS"]);
    sheetData.push([
      "Canal", "% Distribución", "Cantidad", "Venta CUP"
    ]);
    sheetData.push([
      "Venta USD", Number(importacion.porcentajeVentaUSD),
      totalesContenedor.cantidadVentaUSD, totalesContenedor.ventaUSDEnCUP
    ]);
    sheetData.push([
      "Venta Fiscal", Number(importacion.porcentajeVentaFiscal),
      totalesContenedor.cantidadVentaFiscal, totalesContenedor.ventaFiscalCUP
    ]);
    sheetData.push([
      "Venta Efectivo", Number(importacion.porcentajeVentaEfectivo),
      totalesContenedor.cantidadVentaEfectivo, totalesContenedor.ventaEfectivoCUP
    ]);
    sheetData.push([
      "VENTA TOTAL FISCAL", 100, totalesContenedor.cantidadVendible,
      totalesContenedor.ventaTotalFiscal
    ]);
    sheetData.push([]);

    // Costos
    sheetData.push(["COSTOS"]);
    sheetData.push(["Costo Productos (USD→CUP)", totalesContenedor.costoProductosCUP]);
    sheetData.push(["Gastos Contenedor", totalGastosCUP]);
    sheetData.push(["+11% Aporte (deducible)", totalesContenedor.aporte11Porciento]);
    sheetData.push(["+10% Otros Gastos", totalesContenedor.otrosGastosPorciento]);
    sheetData.push(["Costo Total Bruto", totalesContenedor.costoTotalBruto]);
    sheetData.push([]);

    // Impuestos
    sheetData.push(["IMPUESTOS"]);
    sheetData.push(["11% Aporte sobre Ventas", totalesContenedor.aporte11Porciento]);
    sheetData.push(["35% Impuesto Utilidad", totalesContenedor.impuesto35Utilidad]);
    sheetData.push(["Total Impuestos", totalesContenedor.totalImpuestos]);
    sheetData.push(["Carga Tributaria %", cargaTributaria]);
    sheetData.push([]);

    // Utilidad
    sheetData.push(["ANÁLISIS DE UTILIDAD"]);
    sheetData.push(["Utilidad Estimada", totalesContenedor.utilidadEstimada]);
    sheetData.push(["% Utilidad Estimada", porcentajeUtilidadEstimada]);
    sheetData.push(["Utilidad Bruta Real", totalesContenedor.utilidadBrutaReal]);

    // Crear worksheet
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Configurar anchos de columna
    ws["!cols"] = [
      { wch: 20 }, // Producto
      { wch: 12 }, // Cantidad
      { wch: 12 }, // Importe USD
      { wch: 10 }, // % Merma
      { wch: 10 }, // % Margen
      { wch: 12 }, // Media Fiscal
      { wch: 12 }, // Media Efectivo
      { wch: 12 }, // Venta Real Est.
      { wch: 12 }, // Cant. Vendible
      { wch: 12 }, // Gastos Prorr.
      { wch: 12 }, // Costo Unit. USD
      { wch: 12 }, // Costo Unit. CUP
      { wch: 12 }, // Precio USD
      { wch: 12 }, // Precio CUP
      { wch: 12 }, // Precio Fiscal
      { wch: 12 }, // Precio Efectivo
      { wch: 14 }, // Venta USD (CUP)
      { wch: 12 }, // Venta Fiscal
      { wch: 12 }, // Venta Efectivo
      { wch: 12 }, // Costo Total
      { wch: 12 }, // Aporte 11%
      { wch: 12 }, // Impuesto 35%
      { wch: 12 }, // Utilidad Est.
      { wch: 10 }, // % Utilidad
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Importación");

    // Generar buffer
    const buffer = Buffer.from(
      XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    );

    // Generar nombre de archivo
    const fechaStr = formatDate(importacion.fecha).replace(/\//g, "-");
    const filename = `importacion_${importacionId}_${fechaStr}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error al exportar importación:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al exportar importación" },
      { status: 500 }
    );
  }
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
