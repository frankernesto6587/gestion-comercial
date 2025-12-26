"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@/components/ui";
import { monedaSchema, MonedaInput } from "@/lib/validations";

interface Moneda {
  id: number;
  codigo: string;
  nombre: string;
  simbolo: string;
  tasaDefecto: number;
  activo: boolean;
}

interface MonedaFormProps {
  moneda?: Moneda | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MonedaForm({
  moneda,
  onSuccess,
  onCancel,
}: MonedaFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(monedaSchema),
    defaultValues: {
      codigo: moneda?.codigo ?? "",
      nombre: moneda?.nombre ?? "",
      simbolo: moneda?.simbolo ?? "$",
      tasaDefecto: moneda?.tasaDefecto ?? 1,
      activo: moneda?.activo ?? true,
    },
  });

  const onSubmit = async (data: MonedaInput) => {
    setLoading(true);
    setError(null);

    try {
      const url = moneda
        ? `/api/monedas/${moneda.id}`
        : "/api/monedas";
      const method = moneda ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Error al guardar moneda");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-error dark:bg-red-900/20">
          {error}
        </div>
      )}

      <Input
        label="Código"
        placeholder="Ej: USD, EUR, MLC"
        required
        error={errors.codigo?.message}
        {...register("codigo")}
      />

      <Input
        label="Nombre"
        placeholder="Ej: Dólar Estadounidense"
        required
        error={errors.nombre?.message}
        {...register("nombre")}
      />

      <Input
        label="Símbolo"
        placeholder="Ej: $, €"
        error={errors.simbolo?.message}
        {...register("simbolo")}
      />

      <Input
        label="Tasa de Cambio por Defecto (vs MN)"
        type="number"
        step="0.0001"
        placeholder="Ej: 320"
        required
        error={errors.tasaDefecto?.message}
        {...register("tasaDefecto")}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="activo"
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          {...register("activo")}
        />
        <label htmlFor="activo" className="text-sm text-foreground">
          Moneda activa
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {moneda ? "Actualizar" : "Crear"} Moneda
        </Button>
      </div>
    </form>
  );
}
