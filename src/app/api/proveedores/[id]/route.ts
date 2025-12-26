import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { proveedorSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/proveedores/[id] - Obtener proveedor por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const proveedorId = parseInt(id);

    if (isNaN(proveedorId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const proveedor = await prisma.proveedor.findUnique({
      where: { id: proveedorId },
    });

    if (!proveedor) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(proveedor);
  } catch (error) {
    console.error("Error al obtener proveedor:", error);
    return NextResponse.json(
      { error: "Error al obtener proveedor" },
      { status: 500 }
    );
  }
}

// PUT /api/proveedores/[id] - Actualizar proveedor
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const proveedorId = parseInt(id);

    if (isNaN(proveedorId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const result = proveedorSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const proveedor = await prisma.proveedor.update({
      where: { id: proveedorId },
      data: result.data,
    });

    return NextResponse.json(proveedor);
  } catch (error) {
    console.error("Error al actualizar proveedor:", error);

    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un proveedor con ese nombre" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al actualizar proveedor" },
      { status: 500 }
    );
  }
}

// DELETE /api/proveedores/[id] - Eliminar proveedor
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const proveedorId = parseInt(id);

    if (isNaN(proveedorId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar si tiene importaciones asociadas
    const importaciones = await prisma.importacion.count({
      where: { proveedorId },
    });

    if (importaciones > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar el proveedor porque tiene importaciones asociadas",
        },
        { status: 400 }
      );
    }

    await prisma.proveedor.delete({
      where: { id: proveedorId },
    });

    return NextResponse.json({ message: "Proveedor eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar proveedor:", error);
    return NextResponse.json(
      { error: "Error al eliminar proveedor" },
      { status: 500 }
    );
  }
}
