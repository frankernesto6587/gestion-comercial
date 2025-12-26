import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import { transferenciaSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/transferencias/[id] - Obtener transferencia por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const transferenciaId = parseInt(id);

    if (isNaN(transferenciaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const transferencia = await prisma.transferencia.findUnique({
      where: { id: transferenciaId },
      include: {
        venta: {
          select: {
            id: true,
            fechaInicio: true,
            fechaFin: true,
          },
        },
      },
    });

    if (!transferencia) {
      return NextResponse.json(
        { error: "Transferencia no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(transferencia);
  } catch (error) {
    console.error("Error al obtener transferencia:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al obtener transferencia" },
      { status: 500 }
    );
  }
}

// PUT /api/transferencias/[id] - Editar transferencia (solo si no está usada)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const transferenciaId = parseInt(id);

    if (isNaN(transferenciaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar que exista y no esté usada
    const existente = await prisma.transferencia.findUnique({
      where: { id: transferenciaId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Transferencia no encontrada" },
        { status: 404 }
      );
    }

    if (existente.ventaId !== null) {
      return NextResponse.json(
        { error: "No se puede editar una transferencia que ya está asociada a una venta" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validar datos
    const result = transferenciaSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { fecha, monto, refOrigen, refCorriente, ordenante } = result.data;

    // Verificar que refOrigen no esté duplicada (si se proporciona y es diferente a la actual)
    if (refOrigen && refOrigen !== existente.refOrigen) {
      const duplicada = await prisma.transferencia.findUnique({
        where: { refOrigen },
        select: { id: true },
      });

      if (duplicada) {
        return NextResponse.json(
          { error: `Ya existe una transferencia con la referencia de origen: ${refOrigen}` },
          { status: 400 }
        );
      }
    }

    const transferencia = await prisma.transferencia.update({
      where: { id: transferenciaId },
      data: {
        fecha,
        monto,
        refOrigen: refOrigen || null,
        refCorriente: refCorriente || null,
        ordenante: ordenante || null,
      },
    });

    return NextResponse.json(transferencia);
  } catch (error) {
    console.error("Error al actualizar transferencia:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al actualizar transferencia" },
      { status: 500 }
    );
  }
}

// DELETE /api/transferencias/[id] - Eliminar transferencia (solo si no está usada)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const transferenciaId = parseInt(id);

    if (isNaN(transferenciaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar que exista y no esté usada
    const existente = await prisma.transferencia.findUnique({
      where: { id: transferenciaId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Transferencia no encontrada" },
        { status: 404 }
      );
    }

    if (existente.ventaId !== null) {
      return NextResponse.json(
        { error: "No se puede eliminar una transferencia que ya está asociada a una venta" },
        { status: 400 }
      );
    }

    await prisma.transferencia.delete({
      where: { id: transferenciaId },
    });

    return NextResponse.json({ message: "Transferencia eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar transferencia:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al eliminar transferencia" },
      { status: 500 }
    );
  }
}
