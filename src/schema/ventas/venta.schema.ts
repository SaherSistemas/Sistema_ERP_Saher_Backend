import { z } from "zod";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ventaSchema = z.object({
  // id_venta: z.string().regex(uuidRegex, "ID de venta no es un UUID válido").optional(),
  id_cliente: z.string().regex(uuidRegex, "ID de cliente no es un UUID válido"),
  id_empleado: z.string().regex(uuidRegex, "ID empleado no es un UUID valido").optional(),
  id_empre: z.string().regex(uuidRegex, "ID empresa inválido"),
  tipo_venta: z.string(),
  id_metodo_pago: z.string().regex(uuidRegex, "ID método de pago inválido"),
  status_venta: z.string(),
  detalle_venta: z.array(
    z.object({
      id_artic: z.string().regex(uuidRegex, "ID de artículo inválido"),
      cantidad: z.number().int().min(1, "La cantidad debe ser mínimo 1"),
      precio_unitario: z.number().min(0, "El precio debe ser positivo"),
      lote_usado: z.array(
        z.object({
          id_lote_sucursal: z.string().regex(uuidRegex, "ID lote sucursal inválido"),
          cantidad_utilizada: z.number().int().min(1, "Cantidad utilizada debe ser mínimo 1"),
        })
      ).min(1, "Debes agregar al menos un lote usado"),
    })
  ).min(1, "Debes agregar al menos un detalle"),
});

export type VentaFormData = z.infer<typeof ventaSchema>;
