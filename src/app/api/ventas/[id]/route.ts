import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseError, databaseUnavailableResponse } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/ventas/[id] - Obtener venta por ID
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
            productoImportado: {
              include: {
                importacion: true,
              },
            },
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

    // Calcular totales por producto y canal
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

    // Calcular totales generales
    const totalesGenerales = {
      usd: { cantidad: 0, subtotal: 0 },
      fiscal: { cantidad: 0, subtotal: 0 },
      efectivo: { cantidad: 0, subtotal: 0 },
      total: { cantidad: 0, subtotal: 0 },
    };

    for (const prod of Object.values(totalesPorProducto)) {
      totalesGenerales.usd.cantidad += prod.usd.cantidad;
      totalesGenerales.usd.subtotal += prod.usd.subtotal;
      totalesGenerales.fiscal.cantidad += prod.fiscal.cantidad;
      totalesGenerales.fiscal.subtotal += prod.fiscal.subtotal;
      totalesGenerales.efectivo.cantidad += prod.efectivo.cantidad;
      totalesGenerales.efectivo.subtotal += prod.efectivo.subtotal;
      totalesGenerales.total.cantidad += prod.total.cantidad;
      totalesGenerales.total.subtotal += prod.total.subtotal;
    }

    return NextResponse.json({
      ...venta,
      totalesPorProducto,
      totalesGenerales,
    });
  } catch (error) {
    console.error("Error al obtener venta:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al obtener venta" },
      { status: 500 }
    );
  }
}

// DELETE /api/ventas/[id] - Eliminar venta
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ventaId = parseInt(id);

    if (isNaN(ventaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Obtener la venta con sus líneas
    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        lineas: true,
      },
    });

    if (!venta) {
      return NextResponse.json(
        { error: "Venta no encontrada" },
        { status: 404 }
      );
    }

    // Eliminar venta y revertir inventario en transacción
    await prisma.$transaction(async (tx) => {
      // Agrupar líneas por producto
      const unidadesPorProducto = new Map<number, number>();
      for (const linea of venta.lineas) {
        const actual = unidadesPorProducto.get(linea.productoId) || 0;
        unidadesPorProducto.set(linea.productoId, actual + linea.cantidad);
      }

      // Revertir inventario
      for (const [productoId, cantidad] of unidadesPorProducto) {
        const inventario = await tx.inventario.findUnique({
          where: { productoId },
        });

        if (inventario) {
          // Incrementar stock
          await tx.inventario.update({
            where: { id: inventario.id },
            data: {
              cantidadActual: {
                increment: cantidad,
              },
            },
          });

          // Registrar ajuste positivo
          await tx.movimientoInventario.create({
            data: {
              inventarioId: inventario.id,
              tipo: "AJUSTE_POS",
              cantidad,
              motivo: "Eliminación de venta",
              referencia: `Venta #${ventaId} eliminada`,
            },
          });
        }
      }

      // Eliminar venta (cascade elimina transferencias y líneas)
      await tx.venta.delete({
        where: { id: ventaId },
      });
    });

    return NextResponse.json({ message: "Venta eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar venta:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al eliminar venta" },
      { status: 500 }
    );
  }
}
