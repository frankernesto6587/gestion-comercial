import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { importadoraSchema } from "@/lib/validations";

// GET /api/importadoras - Listar importadoras
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activo = searchParams.get("activo");

    const where = activo !== null && activo !== ""
      ? { activo: activo === "true" }
      : {};

    const importadoras = await prisma.importadora.findMany({
      where,
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(importadoras);
  } catch (error) {
    console.error("Error al obtener importadoras:", error);
    return NextResponse.json(
      { error: "Error al obtener importadoras" },
      { status: 500 }
    );
  }
}

// POST /api/importadoras - Crear importadora
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = importadoraSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const importadora = await prisma.importadora.create({
      data: result.data,
    });

    return NextResponse.json(importadora, { status: 201 });
  } catch (error) {
    console.error("Error al crear importadora:", error);

    // Verificar error de duplicado
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una importadora con ese nombre" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al crear importadora" },
      { status: 500 }
    );
  }
}
