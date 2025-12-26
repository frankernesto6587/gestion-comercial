"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@/components/ui";
import { tipoGastoSchema, TipoGastoInput } from "@/lib/validations";

interface TipoGasto {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

interface TipoGastoFormProps {
  tipoGasto?: TipoGasto | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TipoGastoForm({
  tipoGasto,
  onSuccess,
  onCancel,
}: TipoGastoFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(tipoGastoSchema),
    defaultValues: {
      nombre: tipoGasto?.nombre ?? "",
      descripcion: tipoGasto?.descripcion ?? "",
      activo: tipoGasto?.activo ?? true,
    },
  });

  const onSubmit = async (data: TipoGastoInput) => {
    setLoading(true);
    setError(null);

    try {
      const url = tipoGasto
        ? `/api/tipos-gasto/${tipoGasto.id}`
        : "/api/tipos-gasto";
      const method = tipoGasto ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Error al guardar tipo de gasto");
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
        label="Nombre"
        placeholder="Ej: Aranceles, Flete Internacional"
        required
        error={errors.nombre?.message}
        {...register("nombre")}
      />

      <Input
        label="Descripción"
        placeholder="Descripción del tipo de gasto"
        error={errors.descripcion?.message}
        {...register("descripcion")}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="activo"
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          {...register("activo")}
        />
        <label htmlFor="activo" className="text-sm text-foreground">
          Tipo de gasto activo
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {tipoGasto ? "Actualizar" : "Crear"} Tipo de Gasto
        </Button>
      </div>
    </form>
  );
}
