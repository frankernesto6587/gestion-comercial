import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const tipoGastoSchema = z.object({
  nombre: z.string().min(1).max(100),
  descripcion: z.string().max(255).optional().nullable(),
  activo: z.boolean().default(true),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tipos-gasto/[id] - Obtener tipo de gasto por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tipoGastoId = parseInt(id);

    if (isNaN(tipoGastoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const tipoGasto = await prisma.tipoGasto.findUnique({
      where: { id: tipoGastoId },
    });

    if (!tipoGasto) {
      return NextResponse.json(
        { error: "Tipo de gasto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(tipoGasto);
  } catch (error) {
    console.error("Error al obtener tipo de gasto:", error);
    return NextResponse.json(
      { error: "Error al obtener tipo de gasto" },
      { status: 500 }
    );
  }
}

// PUT /api/tipos-gasto/[id] - Actualizar tipo de gasto
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tipoGastoId = parseInt(id);

    if (isNaN(tipoGastoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = tipoGastoSchema.parse(body);

    const tipoGasto = await prisma.tipoGasto.update({
      where: { id: tipoGastoId },
      data: validatedData,
    });

    return NextResponse.json(tipoGasto);
  } catch (error) {
    console.error("Error al actualizar tipo de gasto:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al actualizar tipo de gasto" },
      { status: 500 }
    );
  }
}

// DELETE /api/tipos-gasto/[id] - Eliminar tipo de gasto
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tipoGastoId = parseInt(id);

    if (isNaN(tipoGastoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar si tiene gastos asociados
    const gastos = await prisma.gastoContenedor.count({
      where: { tipoGastoId },
    });

    if (gastos > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar el tipo de gasto porque tiene gastos asociados",
        },
        { status: 400 }
      );
    }

    await prisma.tipoGasto.delete({
      where: { id: tipoGastoId },
    });

    return NextResponse.json({ message: "Tipo de gasto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar tipo de gasto:", error);
    return NextResponse.json(
      { error: "Error al eliminar tipo de gasto" },
      { status: 500 }
    );
  }
}
