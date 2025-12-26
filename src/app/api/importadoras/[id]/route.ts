import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { importadoraSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/importadoras/[id] - Obtener importadora por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const importadoraId = parseInt(id);

    if (isNaN(importadoraId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const importadora = await prisma.importadora.findUnique({
      where: { id: importadoraId },
    });

    if (!importadora) {
      return NextResponse.json(
        { error: "Importadora no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(importadora);
  } catch (error) {
    console.error("Error al obtener importadora:", error);
    return NextResponse.json(
      { error: "Error al obtener importadora" },
      { status: 500 }
    );
  }
}

// PUT /api/importadoras/[id] - Actualizar importadora
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const importadoraId = parseInt(id);

    if (isNaN(importadoraId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const result = importadoraSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const importadora = await prisma.importadora.update({
      where: { id: importadoraId },
      data: result.data,
    });

    return NextResponse.json(importadora);
  } catch (error) {
    console.error("Error al actualizar importadora:", error);

    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una importadora con ese nombre" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al actualizar importadora" },
      { status: 500 }
    );
  }
}

// DELETE /api/importadoras/[id] - Eliminar importadora
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const importadoraId = parseInt(id);

    if (isNaN(importadoraId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar si tiene importaciones asociadas
    const importaciones = await prisma.importacion.count({
      where: { importadoraId },
    });

    if (importaciones > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar la importadora porque tiene importaciones asociadas",
        },
        { status: 400 }
      );
    }

    await prisma.importadora.delete({
      where: { id: importadoraId },
    });

    return NextResponse.json({ message: "Importadora eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar importadora:", error);
    return NextResponse.json(
      { error: "Error al eliminar importadora" },
      { status: 500 }
    );
  }
}
