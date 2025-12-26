import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import { recalcularImportacionPorId } from "@/lib/recalcular";

interface RouteParams {
  params: Promise<{ id: string; gastoId: string }>;
}

// DELETE /api/importaciones/[id]/gastos/[gastoId] - Eliminar gasto
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, gastoId } = await params;
    const importacionId = parseInt(id);
    const gastoIdNum = parseInt(gastoId);

    if (isNaN(importacionId) || isNaN(gastoIdNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar que el gasto existe y pertenece a la importación
    const gasto = await prisma.gastoContenedor.findFirst({
      where: {
        id: gastoIdNum,
        importacionId,
      },
    });

    if (!gasto) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    }

    // Eliminar el gasto
    await prisma.gastoContenedor.delete({
      where: { id: gastoIdNum },
    });

    // Recalcular todos los productos con prorrateo por inversión
    await recalcularImportacionPorId(prisma, importacionId);

    return NextResponse.json({ message: "Gasto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar gasto:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json({ error: "Error al eliminar gasto" }, { status: 500 });
  }
}
