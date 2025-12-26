import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const monedaSchema = z.object({
  codigo: z.string().min(1).max(10),
  nombre: z.string().min(1).max(100),
  simbolo: z.string().min(1).max(5).default("$"),
  tasaDefecto: z.coerce.number().positive(),
  activo: z.boolean().default(true),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/monedas/[id] - Obtener moneda por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const monedaId = parseInt(id);

    if (isNaN(monedaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const moneda = await prisma.moneda.findUnique({
      where: { id: monedaId },
    });

    if (!moneda) {
      return NextResponse.json(
        { error: "Moneda no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(moneda);
  } catch (error) {
    console.error("Error al obtener moneda:", error);
    return NextResponse.json(
      { error: "Error al obtener moneda" },
      { status: 500 }
    );
  }
}

// PUT /api/monedas/[id] - Actualizar moneda
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const monedaId = parseInt(id);

    if (isNaN(monedaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = monedaSchema.parse(body);

    const moneda = await prisma.moneda.update({
      where: { id: monedaId },
      data: validatedData,
    });

    return NextResponse.json(moneda);
  } catch (error) {
    console.error("Error al actualizar moneda:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al actualizar moneda" },
      { status: 500 }
    );
  }
}

// DELETE /api/monedas/[id] - Eliminar moneda
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const monedaId = parseInt(id);

    if (isNaN(monedaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar si tiene gastos asociados
    const gastos = await prisma.gastoContenedor.count({
      where: { monedaId },
    });

    if (gastos > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar la moneda porque tiene gastos asociados",
        },
        { status: 400 }
      );
    }

    // Verificar si tiene tasas de cambio asociadas
    const tasas = await prisma.tasaCambioContenedor.count({
      where: { monedaId },
    });

    if (tasas > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar la moneda porque tiene tasas de cambio asociadas",
        },
        { status: 400 }
      );
    }

    await prisma.moneda.delete({
      where: { id: monedaId },
    });

    return NextResponse.json({ message: "Moneda eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar moneda:", error);
    return NextResponse.json(
      { error: "Error al eliminar moneda" },
      { status: 500 }
    );
  }
}
