import { NextResponse } from "next/server";
import { prisma, isDatabaseError, databaseUnavailableResponse } from "@/lib/db";

// GET /api/dashboard - Obtener estadísticas del dashboard
export async function GET() {
  try {
    // Obtener fecha de hace 30 días
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    // Estadísticas en paralelo
    const [
      totalProductos,
      productosActivos,
      totalImportaciones,
      importacionesMes,
      inventarioStats,
      ultimasImportaciones,
      productosStockBajo,
    ] = await Promise.all([
      // Total de productos
      prisma.producto.count(),

      // Productos activos
      prisma.producto.count({ where: { activo: true } }),

      // Total de importaciones
      prisma.importacion.count(),

      // Importaciones del mes
      prisma.importacion.count({
        where: { fecha: { gte: hace30Dias } },
      }),

      // Estadísticas de inventario
      prisma.inventario.aggregate({
        _sum: { cantidadActual: true },
        _count: true,
      }),

      // Últimas 5 importaciones
      prisma.importacion.findMany({
        take: 5,
        orderBy: { fecha: "desc" },
        include: {
          importadora: true,
          productos: {
            include: { producto: true },
          },
        },
      }),

      // Productos con stock bajo
      prisma.inventario.findMany({
        where: {
          cantidadMinima: { gt: 0 },
          producto: { activo: true },
        },
        include: { producto: true },
      }),
    ]);

    // Filtrar productos con stock bajo (Prisma no permite comparar campos)
    const stockBajo = productosStockBajo.filter(
      (inv: typeof productosStockBajo[number]) => inv.cantidadActual <= inv.cantidadMinima
    );

    // Calcular totales de importaciones del mes
    const importacionesMesData = await prisma.importacion.findMany({
      where: { fecha: { gte: hace30Dias } },
      include: { productos: true },
    });

    type ImportacionConProductos = typeof importacionesMesData[number];
    type ProductoImportado = ImportacionConProductos['productos'][number];

    const totalInvertidoMes = importacionesMesData.reduce((sum: number, imp: ImportacionConProductos) => {
      return (
        sum +
        imp.productos.reduce((s: number, p: ProductoImportado) => s + Number(p.importeUSD), 0)
      );
    }, 0);

    const totalUnidadesMes = importacionesMesData.reduce((sum: number, imp: ImportacionConProductos) => {
      return (
        sum + imp.productos.reduce((s: number, p: ProductoImportado) => s + p.cantidadUnidades, 0)
      );
    }, 0);

    // Tipos para ultimasImportaciones
    type UltimaImportacion = typeof ultimasImportaciones[number];
    type ProductoUltima = UltimaImportacion['productos'][number];
    type StockBajoItem = typeof stockBajo[number];

    // Formatear últimas importaciones
    const ultimasFormateadas = ultimasImportaciones.map((imp: UltimaImportacion) => ({
      id: imp.id,
      fecha: imp.fecha,
      importadora: imp.importadora,
      numeroContenedor: imp.numeroContenedor,
      totalUSD: imp.productos.reduce(
        (sum: number, p: ProductoUltima) => sum + Number(p.importeUSD),
        0
      ),
      totalUnidades: imp.productos.reduce(
        (sum: number, p: ProductoUltima) => sum + p.cantidadUnidades,
        0
      ),
      cantidadProductos: imp.productos.length,
    }));

    return NextResponse.json({
      stats: {
        productos: {
          total: totalProductos,
          activos: productosActivos,
        },
        importaciones: {
          total: totalImportaciones,
          ultimoMes: importacionesMes,
          invertidoMes: totalInvertidoMes,
          unidadesMes: totalUnidadesMes,
        },
        inventario: {
          totalUnidades: inventarioStats._sum.cantidadActual || 0,
          productosConInventario: inventarioStats._count,
          stockBajo: stockBajo.length,
        },
      },
      ultimasImportaciones: ultimasFormateadas,
      alertasStock: stockBajo.map((inv: StockBajoItem) => ({
        id: inv.id,
        producto: inv.producto.nombre,
        actual: inv.cantidadActual,
        minimo: inv.cantidadMinima,
      })),
    });
  } catch (error) {
    console.error("Error al obtener dashboard:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
