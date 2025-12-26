import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { movimientoSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/inventario/[id]/movimientos - Obtener movimientos de un inventario
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const inventarioId = parseInt(id);

    if (isNaN(inventarioId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");

    const movimientos = await prisma.movimientoInventario.findMany({
      where: { inventarioId },
      orderBy: { fecha: "desc" },
      take: limit,
    });

    return NextResponse.json(movimientos);
  } catch (error) {
    console.error("Error al obtener movimientos:", error);
    return NextResponse.json(
      { error: "Error al obtener movimientos" },
      { status: 500 }
    );
  }
}

// POST /api/inventario/[id]/movimientos - Registrar movimiento
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const inventarioId = parseInt(id);

    if (isNaN(inventarioId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = movimientoSchema.parse({ ...body, inventarioId });

    // Verificar que el inventario existe
    const inventario = await prisma.inventario.findUnique({
      where: { id: inventarioId },
    });

    if (!inventario) {
      return NextResponse.json(
        { error: "Inventario no encontrado" },
        { status: 404 }
      );
    }

    // Calcular nuevo stock según tipo de movimiento
    let nuevoStock = inventario.cantidadActual;
    const { tipo, cantidad } = validatedData;

    switch (tipo) {
      case "ENTRADA":
      case "AJUSTE_POS":
        nuevoStock += cantidad;
        break;
      case "SALIDA":
      case "MERMA":
      case "AJUSTE_NEG":
        nuevoStock -= cantidad;
        if (nuevoStock < 0) {
          return NextResponse.json(
            { error: "No hay suficiente stock disponible" },
            { status: 400 }
          );
        }
        break;
    }

    // Crear movimiento y actualizar stock en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const movimiento = await tx.movimientoInventario.create({
        data: {
          inventarioId,
          tipo: validatedData.tipo,
          cantidad: validatedData.cantidad,
          motivo: validatedData.motivo,
          referencia: validatedData.referencia,
          fecha: validatedData.fecha,
        },
      });

      const inventarioActualizado = await tx.inventario.update({
        where: { id: inventarioId },
        data: { cantidadActual: nuevoStock },
      });

      return { movimiento, inventario: inventarioActualizado };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error("Error al registrar movimiento:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al registrar movimiento" },
      { status: 500 }
    );
  }
}
