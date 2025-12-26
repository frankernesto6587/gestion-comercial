import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateExcel, columnasImportacion, columnasInventario, columnasProductos } from "@/lib/excel";

// GET /api/reportes - Generar reporte Excel
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tipo = searchParams.get("tipo") || "importaciones";
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");

    let buffer: Buffer;
    let filename: string;

    switch (tipo) {
      case "importaciones": {
        const importaciones = await prisma.importacion.findMany({
          where: {
            ...(fechaDesde && { fecha: { gte: new Date(fechaDesde) } }),
            ...(fechaHasta && { fecha: { lte: new Date(fechaHasta) } }),
          },
          include: {
            importadora: true,
            productos: {
              include: { producto: true },
            },
            tasasCambio: {
              include: { moneda: true },
            },
          },
          orderBy: { fecha: "desc" },
        });

        // Aplanar datos para Excel (una fila por producto importado)
        const data = importaciones.flatMap((imp) => {
          // Obtener tasa de cambio USD del contenedor
          const tasaUSD = imp.tasasCambio.find((t) => t.moneda.codigo === "USD");
          const tasaCambioUSD = tasaUSD ? Number(tasaUSD.tasaCambio) : 320;

          return imp.productos.map((p) => ({
            fecha: imp.fecha.toISOString().split("T")[0],
            numeroContenedor: imp.numeroContenedor || "",
            importadora: imp.importadora,
            producto: `${p.producto.nombre}${p.producto.descripcion ? ` - ${p.producto.descripcion}` : ""}`,
            cantidadUnidades: p.cantidadUnidades,
            importeUSD: Number(p.importeUSD),
            costoUnitarioUSD: Number(p.costoUnitarioUSD),
            precioVentaUSD: Number(p.precioVentaUSD),
            precioVentaCUP: Number(p.precioVentaCUP),
            tasaCambio: tasaCambioUSD,
          }));
        });

        buffer = generateExcel(data, {
          sheetName: "Importaciones",
          columns: columnasImportacion,
        });
        filename = `importaciones_${new Date().toISOString().split("T")[0]}.xlsx`;
        break;
      }

      case "inventario": {
        const inventarios = await prisma.inventario.findMany({
          include: { producto: true },
          orderBy: { producto: { nombre: "asc" } },
        });

        const data = inventarios.map((inv) => ({
          producto: inv.producto.nombre,
          descripcion: inv.producto.descripcion || "",
          cantidadActual: inv.cantidadActual,
          cantidadMinima: inv.cantidadMinima,
          estado:
            inv.cantidadActual === 0
              ? "Sin Stock"
              : inv.cantidadActual <= inv.cantidadMinima && inv.cantidadMinima > 0
              ? "Stock Bajo"
              : "OK",
        }));

        buffer = generateExcel(data, {
          sheetName: "Inventario",
          columns: columnasInventario,
        });
        filename = `inventario_${new Date().toISOString().split("T")[0]}.xlsx`;
        break;
      }

      case "productos": {
        const productos = await prisma.producto.findMany({
          orderBy: { nombre: "asc" },
        });

        const data = productos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion || "",
          unidadMedida: p.unidadMedida,
          activo: p.activo ? "Sí" : "No",
        }));

        buffer = generateExcel(data, {
          sheetName: "Productos",
          columns: columnasProductos,
        });
        filename = `productos_${new Date().toISOString().split("T")[0]}.xlsx`;
        break;
      }

      default:
        return NextResponse.json(
          { error: "Tipo de reporte no válido" },
          { status: 400 }
        );
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error al generar reporte:", error);
    return NextResponse.json(
      { error: "Error al generar reporte" },
      { status: 500 }
    );
  }
}
