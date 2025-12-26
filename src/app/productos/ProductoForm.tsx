"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@/components/ui";
import { productoSchema, ProductoInput } from "@/lib/validations";

interface Producto {
  id: number;
  codefref: number | null;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string;
  pack: number;
  activo: boolean;
}

interface ProductoFormProps {
  producto?: Producto | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductoForm({
  producto,
  onSuccess,
  onCancel,
}: ProductoFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      codefref: producto?.codefref ?? undefined,
      nombre: producto?.nombre ?? "",
      descripcion: producto?.descripcion ?? "",
      unidadMedida: producto?.unidadMedida ?? "unidad",
      pack: producto?.pack ?? 24,
      activo: producto?.activo ?? true,
    },
  });

  const onSubmit = async (data: ProductoInput) => {
    setLoading(true);
    setError(null);

    try {
      const url = producto
        ? `/api/productos/${producto.id}`
        : "/api/productos";
      const method = producto ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Error al guardar producto");
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
        label="Código de Referencia"
        type="number"
        placeholder="Ej: 12345"
        error={errors.codefref?.message}
        {...register("codefref")}
      />

      <Input
        label="Nombre"
        placeholder="Ej: Malta Bucanero"
        required
        error={errors.nombre?.message}
        {...register("nombre")}
      />

      <Input
        label="Descripción"
        placeholder="Ej: Lata 355ml"
        error={errors.descripcion?.message}
        {...register("descripcion")}
      />

      <Input
        label="Unidad de Medida"
        placeholder="Ej: unidad, caja, kg"
        error={errors.unidadMedida?.message}
        {...register("unidadMedida")}
      />

      <Input
        label="Pack (cantidad mínima de venta)"
        type="number"
        placeholder="Ej: 24"
        error={errors.pack?.message}
        {...register("pack")}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="activo"
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          {...register("activo")}
        />
        <label htmlFor="activo" className="text-sm text-foreground">
          Producto activo
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {producto ? "Actualizar" : "Crear"} Producto
        </Button>
      </div>
    </form>
  );
}
