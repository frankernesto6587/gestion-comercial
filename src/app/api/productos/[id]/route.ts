import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { productoSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/productos/[id] - Obtener producto por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const productoId = parseInt(id);

    if (isNaN(productoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      include: {
        inventario: true,
        importaciones: {
          include: {
            importacion: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!producto) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error("Error al obtener producto:", error);
    return NextResponse.json(
      { error: "Error al obtener producto" },
      { status: 500 }
    );
  }
}

// PUT /api/productos/[id] - Actualizar producto
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const productoId = parseInt(id);

    if (isNaN(productoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = productoSchema.parse(body);

    const producto = await prisma.producto.update({
      where: { id: productoId },
      data: validatedData,
    });

    return NextResponse.json(producto);
  } catch (error) {
    console.error("Error al actualizar producto:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}

// DELETE /api/productos/[id] - Eliminar producto
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const productoId = parseInt(id);

    if (isNaN(productoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar si tiene importaciones asociadas
    const importaciones = await prisma.productoImportado.count({
      where: { productoId },
    });

    if (importaciones > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar el producto porque tiene importaciones asociadas",
        },
        { status: 400 }
      );
    }

    // Eliminar inventario asociado
    await prisma.inventario.deleteMany({
      where: { productoId },
    });

    // Eliminar producto
    await prisma.producto.delete({
      where: { id: productoId },
    });

    return NextResponse.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}
