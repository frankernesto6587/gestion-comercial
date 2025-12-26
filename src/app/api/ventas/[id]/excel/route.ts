import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import * as XLSX from "xlsx";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/ventas/[id]/excel - Exportar venta a Excel
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ventaId = parseInt(id);

    if (isNaN(ventaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        transferencias: {
          orderBy: { fecha: "asc" },
        },
        lineas: {
          include: {
            producto: true,
          },
          orderBy: [{ fecha: "asc" }, { productoId: "asc" }],
        },
      },
    });

    if (!venta) {
      return NextResponse.json(
        { error: "Venta no encontrada" },
        { status: 404 }
      );
    }

    // Crear workbook
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const resumenData = [
      ["RESUMEN DE VENTA"],
      [],
      ["Campo", "Valor"],
      ["ID Venta", venta.id],
      [
        "Período",
        `${formatDate(venta.fechaInicio)} - ${formatDate(venta.fechaFin)}`,
      ],
      ["Modo Distribución", venta.modoDistribucion],
      ["Total Transferencias", Number(venta.totalTransferencias)],
      ["Total Unidades", venta.totalUnidades],
      ["Total CUP", Number(venta.totalCUP)],
      ["Cantidad de Líneas", venta.lineas.length],
      ["Observaciones", venta.observaciones || "-"],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen["!cols"] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    // Hoja 2: Ventas por Día
    const ventasPorDiaHeaders = [
      "Fecha",
      "Producto",
      "Canal",
      "Cantidad",
      "Precio Unitario",
      "Subtotal",
    ];
    const ventasPorDiaData = venta.lineas.map((linea) => [
      formatDate(linea.fecha),
      linea.producto.nombre,
      linea.canal,
      linea.cantidad,
      Number(linea.precioUnitario),
      Number(linea.subtotal),
    ]);
    const wsVentas = XLSX.utils.aoa_to_sheet([
      ventasPorDiaHeaders,
      ...ventasPorDiaData,
    ]);
    wsVentas["!cols"] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas por Día");

    // Hoja 3: Totales por Producto
    // Calcular totales
    const totalesPorProducto: Record<
      number,
      {
        nombre: string;
        usd: { cantidad: number; subtotal: number };
        fiscal: { cantidad: number; subtotal: number };
        efectivo: { cantidad: number; subtotal: number };
        total: { cantidad: number; subtotal: number };
      }
    > = {};

    for (const linea of venta.lineas) {
      if (!totalesPorProducto[linea.productoId]) {
        totalesPorProducto[linea.productoId] = {
          nombre: linea.producto.nombre,
          usd: { cantidad: 0, subtotal: 0 },
          fiscal: { cantidad: 0, subtotal: 0 },
          efectivo: { cantidad: 0, subtotal: 0 },
          total: { cantidad: 0, subtotal: 0 },
        };
      }

      const prod = totalesPorProducto[linea.productoId];
      const canal = linea.canal.toLowerCase() as "usd" | "fiscal" | "efectivo";
      prod[canal].cantidad += linea.cantidad;
      prod[canal].subtotal += Number(linea.subtotal);
      prod.total.cantidad += linea.cantidad;
      prod.total.subtotal += Number(linea.subtotal);
    }

    const totalesHeaders = [
      "Producto",
      "Canal",
      "Cantidad",
      "Subtotal CUP",
    ];
    const totalesData: (string | number)[][] = [];
    for (const prod of Object.values(totalesPorProducto)) {
      totalesData.push([prod.nombre, "USD", prod.usd.cantidad, prod.usd.subtotal]);
      totalesData.push([prod.nombre, "FISCAL", prod.fiscal.cantidad, prod.fiscal.subtotal]);
      totalesData.push([prod.nombre, "EFECTIVO", prod.efectivo.cantidad, prod.efectivo.subtotal]);
      totalesData.push([prod.nombre, "TOTAL", prod.total.cantidad, prod.total.subtotal]);
      totalesData.push(["", "", "", ""]); // Línea vacía entre productos
    }
    const wsTotales = XLSX.utils.aoa_to_sheet([totalesHeaders, ...totalesData]);
    wsTotales["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsTotales, "Totales por Producto");

    // Hoja 4: Movimientos Inventario
    const movimientosHeaders = [
      "Producto",
      "Unidades Vendidas",
    ];
    const productosAgrupados = new Map<number, { nombre: string; cantidad: number }>();
    for (const linea of venta.lineas) {
      const actual = productosAgrupados.get(linea.productoId);
      if (actual) {
        actual.cantidad += linea.cantidad;
      } else {
        productosAgrupados.set(linea.productoId, {
          nombre: linea.producto.nombre,
          cantidad: linea.cantidad,
        });
      }
    }
    const movimientosData = Array.from(productosAgrupados.values()).map((p) => [
      p.nombre,
      p.cantidad,
    ]);
    const wsMovimientos = XLSX.utils.aoa_to_sheet([
      movimientosHeaders,
      ...movimientosData,
    ]);
    wsMovimientos["!cols"] = [{ wch: 25 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsMovimientos, "Movimientos Inventario");

    // Generar buffer
    const buffer = Buffer.from(
      XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    );

    // Retornar archivo
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="venta-${ventaId}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error al exportar venta:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al exportar venta" },
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
