import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/inventario - Listar inventario
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const busqueda = searchParams.get("busqueda") || "";
    const stockBajo = searchParams.get("stockBajo") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const inventarios = await prisma.inventario.findMany({
      where: {
        producto: {
          activo: true,
          ...(busqueda && {
            OR: [
              { nombre: { contains: busqueda, mode: "insensitive" } },
              { descripcion: { contains: busqueda, mode: "insensitive" } },
            ],
          }),
        },
        ...(stockBajo && {
          cantidadActual: {
            lte: prisma.inventario.fields.cantidadMinima,
          },
        }),
      },
      include: {
        producto: true,
      },
      orderBy: {
        producto: {
          nombre: "asc",
        },
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Para stock bajo, filtramos manualmente ya que Prisma no soporta comparar campos
    let resultados = inventarios;
    if (stockBajo) {
      resultados = inventarios.filter(
        (inv) => inv.cantidadActual <= inv.cantidadMinima && inv.cantidadMinima > 0
      );
    }

    // Calcular estadísticas
    const todosInventarios = await prisma.inventario.findMany({
      include: { producto: { select: { activo: true } } },
    });

    const stats = {
      totalProductos: todosInventarios.filter((i) => i.producto.activo).length,
      productosConStock: todosInventarios.filter(
        (i) => i.producto.activo && i.cantidadActual > 0
      ).length,
      productosSinStock: todosInventarios.filter(
        (i) => i.producto.activo && i.cantidadActual === 0
      ).length,
      productosStockBajo: todosInventarios.filter(
        (i) =>
          i.producto.activo &&
          i.cantidadActual <= i.cantidadMinima &&
          i.cantidadMinima > 0
      ).length,
    };

    const total = await prisma.inventario.count({
      where: {
        producto: {
          activo: true,
          ...(busqueda && {
            OR: [
              { nombre: { contains: busqueda, mode: "insensitive" } },
              { descripcion: { contains: busqueda, mode: "insensitive" } },
            ],
          }),
        },
      },
    });

    return NextResponse.json({
      data: resultados,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error al obtener inventario:", error);
    return NextResponse.json(
      { error: "Error al obtener inventario" },
      { status: 500 }
    );
  }
}
