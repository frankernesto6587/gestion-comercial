import { PrismaClient, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Verifica si un error es de conexión a base de datos
 */
export function isDatabaseError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Error && error.message.includes("Can't reach database")) {
    return true;
  }
  return false;
}

/**
 * Respuesta estándar cuando la BD no está disponible
 */
export function databaseUnavailableResponse() {
  return NextResponse.json(
    { error: "Base de datos no disponible. Intente en unos segundos." },
    { status: 503 }
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
