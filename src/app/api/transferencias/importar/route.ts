import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma, isDatabaseError, databaseUnavailableResponse } from "@/lib/db";

// Interfaz para las filas del extracto bancario
interface ExtractoBancarioRow {
  Fecha?: number | string | Date;
  "Tipo Registro"?: string;
  "Ref. Corriente"?: string;
  "Ref. Origen"?: string;
  Canal?: string;
  Ordenante?: string;
  "CI Ordenante"?: string;
  "Cuenta Ordenante"?: string;
  Tarjeta?: string;
  "Cuenta Beneficiario"?: string;
  Concepto?: string;
  Débito?: number;
  Crédito?: number;
  Balance?: number;
  Observaciones?: string;
}

// Convertir número serial de Excel a fecha
function excelDateToJSDate(serial: number): Date {
  // Excel cuenta días desde el 1 de enero de 1900 (con bug del año bisiesto 1900)
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400 * 1000;
  return new Date(utcValue);
}

// POST /api/transferencias/importar - Importar transferencias desde extracto bancario Excel
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // Leer el archivo Excel
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    // Tomar la primera hoja
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convertir a JSON
    const rows = XLSX.utils.sheet_to_json<ExtractoBancarioRow>(worksheet);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "El archivo está vacío o no tiene el formato esperado" },
        { status: 400 }
      );
    }

    // Filtrar solo transferencias de Banca Móvil con créditos > 0
    const transferenciasValidas: {
      fecha: Date;
      monto: number;
      refOrigen: string;
      refCorriente: string | null;
      ordenante: string | null;
    }[] = [];
    const errores: string[] = [];
    let filasOmitidas = 0;

    rows.forEach((row, index) => {
      const rowNum = index + 2; // +2 porque Excel empieza en 1 y tiene encabezado

      // Solo procesar filas con Canal = "Banca Móvil" y Crédito > 0
      const canal = row.Canal?.trim();
      const credito = row["Crédito"];

      if (canal !== "Banca Móvil" || !credito || credito <= 0) {
        filasOmitidas++;
        return;
      }

      // Obtener Ref. Origen (requerido para identificación única)
      const refOrigen = row["Ref. Origen"]?.trim();
      if (!refOrigen) {
        errores.push(`Fila ${rowNum}: Ref. Origen vacía`);
        return;
      }

      // Parsear fecha (puede ser número serial de Excel o string)
      let fecha: Date;
      const fechaValue = row.Fecha;

      if (typeof fechaValue === "number") {
        fecha = excelDateToJSDate(fechaValue);
      } else if (fechaValue instanceof Date) {
        fecha = fechaValue;
      } else if (typeof fechaValue === "string" && fechaValue.trim()) {
        fecha = new Date(fechaValue);
        if (isNaN(fecha.getTime())) {
          errores.push(`Fila ${rowNum}: Fecha inválida "${fechaValue}"`);
          return;
        }
      } else {
        errores.push(`Fila ${rowNum}: Fecha vacía o inválida`);
        return;
      }

      // Validar que la fecha sea válida
      if (isNaN(fecha.getTime())) {
        errores.push(`Fila ${rowNum}: Fecha inválida`);
        return;
      }

      transferenciasValidas.push({
        fecha,
        monto: credito,
        refOrigen,
        refCorriente: row["Ref. Corriente"]?.trim() || null,
        ordenante: row.Ordenante?.trim() || null,
      });
    });

    if (transferenciasValidas.length === 0) {
      return NextResponse.json(
        {
          error: "No se encontraron transferencias válidas de Banca Móvil con créditos",
          filasOmitidas,
          errores: errores.length > 0 ? errores : undefined,
        },
        { status: 400 }
      );
    }

    // Obtener las refOrigen que ya existen en la base de datos
    const refOrigenList = transferenciasValidas.map((t) => t.refOrigen);
    const existentes = await prisma.transferencia.findMany({
      where: {
        refOrigen: {
          in: refOrigenList,
        },
      },
      select: {
        refOrigen: true,
      },
    });

    const refOrigenExistentes = new Set(existentes.map((e) => e.refOrigen));

    // Separar transferencias nuevas de duplicadas
    const nuevas = transferenciasValidas.filter(
      (t) => !refOrigenExistentes.has(t.refOrigen)
    );
    const duplicadas = transferenciasValidas.filter((t) =>
      refOrigenExistentes.has(t.refOrigen)
    );

    // Insertar solo las nuevas
    let importadas = 0;
    if (nuevas.length > 0) {
      const resultado = await prisma.transferencia.createMany({
        data: nuevas,
      });
      importadas = resultado.count;
    }

    // Preparar respuesta
    const response: {
      message: string;
      importadas: number;
      duplicadas: number;
      codigosDuplicados?: string[];
      filasOmitidas: number;
      errores?: string[];
    } = {
      message: `Se importaron ${importadas} transferencias correctamente`,
      importadas,
      duplicadas: duplicadas.length,
      filasOmitidas,
    };

    if (duplicadas.length > 0) {
      response.codigosDuplicados = duplicadas.map((d) => d.refOrigen);
    }

    if (errores.length > 0) {
      response.errores = errores;
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error al importar transferencias:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al importar transferencias" },
      { status: 500 }
    );
  }
}
