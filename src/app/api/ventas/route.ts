import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import { crearVentaConTransferenciasSchema } from "@/lib/validations";
import { z } from "zod";

// GET /api/ventas - Listar ventas
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");

    const where = {
      AND: [
        fechaDesde ? { fechaInicio: { gte: new Date(fechaDesde) } } : {},
        fechaHasta ? { fechaFin: { lte: new Date(fechaHasta) } } : {},
      ],
    };

    const [ventas, total] = await Promise.all([
      prisma.venta.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          transferencias: {
            orderBy: { fecha: "asc" },
          },
          _count: {
            select: { lineas: true },
          },
        },
      }),
      prisma.venta.count({ where }),
    ]);

    return NextResponse.json({
      data: ventas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error al obtener ventas:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al obtener ventas" },
      { status: 500 }
    );
  }
}

// POST /api/ventas - Crear venta (después de confirmar preview)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = crearVentaConTransferenciasSchema.parse(body);

    // Crear venta con todas las líneas en una transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Verificar que todas las transferencias existan y estén disponibles
      const transferencias = await tx.transferencia.findMany({
        where: {
          id: { in: validatedData.transferenciaIds },
        },
      });

      if (transferencias.length !== validatedData.transferenciaIds.length) {
        throw new Error("Algunas transferencias no fueron encontradas");
      }

      const transferenciasNoDisponibles = transferencias.filter(
        (t) => t.ventaId !== null
      );
      if (transferenciasNoDisponibles.length > 0) {
        throw new Error(
          "Algunas transferencias ya están asociadas a otra venta"
        );
      }

      // Crear la venta
      const venta = await tx.venta.create({
        data: {
          fechaInicio: validatedData.fechaInicio,
          fechaFin: validatedData.fechaFin,
          totalTransferencias: validatedData.totalTransferencias,
          totalUnidades: validatedData.totalUnidades,
          totalCUP: validatedData.totalCUP,
          modoDistribucion: validatedData.modoDistribucion,
          observaciones: validatedData.observaciones || null,
        },
      });

      // Vincular las transferencias existentes a esta venta
      if (validatedData.transferenciaIds.length > 0) {
        await tx.transferencia.updateMany({
          where: {
            id: { in: validatedData.transferenciaIds },
          },
          data: {
            ventaId: venta.id,
          },
        });
      }

      // Crear las líneas de venta
      if (validatedData.lineas.length > 0) {
        await tx.lineaVenta.createMany({
          data: validatedData.lineas.map((l) => ({
            ventaId: venta.id,
            fecha: l.fecha,
            productoId: l.productoId,
            productoImportadoId: l.productoImportadoId,
            canal: l.canal,
            cantidad: l.cantidad,
            precioUnitario: l.precioUnitario,
            subtotal: l.subtotal,
          })),
        });
      }

      // Agrupar líneas por producto para decrementar inventario
      const unidadesPorProducto = new Map<number, number>();
      for (const linea of validatedData.lineas) {
        const actual = unidadesPorProducto.get(linea.productoId) || 0;
        unidadesPorProducto.set(linea.productoId, actual + linea.cantidad);
      }

      // Decrementar inventario y registrar movimientos
      for (const [productoId, cantidad] of unidadesPorProducto) {
        const inventario = await tx.inventario.findUnique({
          where: { productoId },
        });

        if (inventario) {
          // Decrementar stock
          await tx.inventario.update({
            where: { id: inventario.id },
            data: {
              cantidadActual: {
                decrement: cantidad,
              },
            },
          });

          // Registrar movimiento de salida
          await tx.movimientoInventario.create({
            data: {
              inventarioId: inventario.id,
              tipo: "SALIDA",
              cantidad,
              motivo: "Venta",
              referencia: `Venta #${venta.id}`,
            },
          });
        }
      }

      return venta;
    });

    // Obtener la venta completa
    const ventaCompleta = await prisma.venta.findUnique({
      where: { id: resultado.id },
      include: {
        transferencias: {
          orderBy: { fecha: "asc" },
        },
        lineas: {
          include: {
            producto: true,
          },
        },
      },
    });

    return NextResponse.json(ventaCompleta, { status: 201 });
  } catch (error) {
    console.error("Error al crear venta:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }

    // Errores de validación personalizados
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Error al crear venta" },
      { status: 500 }
    );
  }
}
