import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { proveedorSchema } from "@/lib/validations";

// GET /api/proveedores - Listar proveedores
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activo = searchParams.get("activo");

    const where = activo !== null && activo !== ""
      ? { activo: activo === "true" }
      : {};

    const proveedores = await prisma.proveedor.findMany({
      where,
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(proveedores);
  } catch (error) {
    console.error("Error al obtener proveedores:", error);
    return NextResponse.json(
      { error: "Error al obtener proveedores" },
      { status: 500 }
    );
  }
}

// POST /api/proveedores - Crear proveedor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = proveedorSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const proveedor = await prisma.proveedor.create({
      data: result.data,
    });

    return NextResponse.json(proveedor, { status: 201 });
  } catch (error) {
    console.error("Error al crear proveedor:", error);

    // Verificar error de duplicado
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un proveedor con ese nombre" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al crear proveedor" },
      { status: 500 }
    );
  }
}
