import { Op } from "sequelize";
import Articulo from "../modules/Catalogos/Articulos/model/Articulo";
import Tipo_IVA from "../modules/Catalogos/Articulos/model/Tipo_IVA";
import { OfertaRepository } from "../repository/Ofertas/Ofertas.repository";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type InfoIVA = {
  porcentaje: number;  // 0–100, ej: 16
  tipo_factor: "Tasa" | "Cuota" | "Exento";
};

export type OfertaAplicadaCheckout = {
  id_oferta: string;
  nombre_oferta: string;
  tipo_beneficio: string;
  valor: number | null;
  cantidad_minima: number | null;
  cantidad_regalo: number | null;
  exclusiva: boolean;
};

export type InfoArticuloCheckout = {
  iva: InfoIVA;
  oferta: OfertaAplicadaCheckout | null;
};

// ─── IVA ──────────────────────────────────────────────────────────────────────

export async function fetchIVAMap(idsArticulos: string[]): Promise<Map<string, InfoIVA>> {
  const articulos = await Articulo.findAll({
    where: { id_artic: { [Op.in]: idsArticulos } },
    attributes: ["id_artic", "tipo_de_iva"],
    include: [{
      model: Tipo_IVA,
      attributes: ["porcentaje_iva", "tipo_factor"],
    }],
    raw: true,
    nest: true,
  });

  const map = new Map<string, InfoIVA>();
  for (const a of articulos as any[]) {
    map.set(a.id_artic, {
      porcentaje: Number(a["Tipo_IVA.porcentaje_iva"] ?? a.Tipo_IVA?.porcentaje_iva ?? 0),
      tipo_factor: a["Tipo_IVA.tipo_factor"] ?? a.Tipo_IVA?.tipo_factor ?? "Exento",
    });
  }
  return map;
}

// Precio incluye IVA → desglosar
export function desglosarIVA(precioConIVA: number, cantidad: number, iva: InfoIVA) {
  if (iva.tipo_factor === "Exento" || iva.porcentaje === 0) {
    return { subtotal_renglon: +(precioConIVA * cantidad).toFixed(2), iva_renglon: 0 };
  }
  const factor = 1 + iva.porcentaje / 100;
  const precioBase = precioConIVA / factor;
  const subtotal_renglon = +(precioBase * cantidad).toFixed(2);
  const iva_renglon = +(precioConIVA * cantidad - subtotal_renglon).toFixed(2);
  return { subtotal_renglon, iva_renglon };
}

// ─── Ofertas ──────────────────────────────────────────────────────────────────

export async function fetchOfertaMap(
  idsArticulos: string[],
  id_empre: string
): Promise<Map<string, OfertaAplicadaCheckout>> {
  const ofertasActivas = await OfertaRepository.getOfertasSucursal({
    id_empre,
    fecha: new Date(),
    canal: "PDV",
  });

  const map = new Map<string, OfertaAplicadaCheckout>();

  for (const oferta of ofertasActivas) {
    const alcances: any[] = oferta.get("alcances") ?? [];
    const reglas: any[] = oferta.get("reglas") ?? [];
    if (!reglas.length) continue;

    const regla = reglas[0];

    for (const alc of alcances) {
      const targets: string[] =
        alc.tipo_alcance === "GLOBAL"
          ? idsArticulos
          : alc.tipo_alcance === "ARTICULO" && alc.id_referencia
            ? [alc.id_referencia]
            : [];

      for (const id of targets) {
        if (!map.has(id)) {
          map.set(id, {
            id_oferta: oferta.id_oferta,
            nombre_oferta: oferta.nombre_oferta,
            tipo_beneficio: regla.tipo_beneficio,
            valor: regla.valor ?? null,
            cantidad_minima: regla.cantidad_minima ?? null,
            cantidad_regalo: regla.cantidad_regalo ?? null,
            exclusiva: regla.exclusiva ?? false,
          });
        }
      }
    }
  }

  return map;
}

// ─── Calcular descuento por renglón ───────────────────────────────────────────

export function calcDescuentoRenglon(
  precioUnitario: number,
  cantidad: number,
  oferta: OfertaAplicadaCheckout
): { precioConDescuento: number; descuento: number } {
  const totalSinDesc = precioUnitario * cantidad;

  switch (oferta.tipo_beneficio) {
    case "PORCENTAJE":
      if (oferta.valor === null) break;
      const descPct = +(totalSinDesc * oferta.valor / 100).toFixed(2);
      return { precioConDescuento: precioUnitario * (1 - oferta.valor / 100), descuento: descPct };

    case "MONTO_FIJO":
      if (oferta.valor === null) break;
      const precioDesc = Math.max(0, precioUnitario - oferta.valor);
      return { precioConDescuento: precioDesc, descuento: +(oferta.valor * cantidad).toFixed(2) };

    case "BOGO": {
      const min = oferta.cantidad_minima ?? 2;
      const regalo = oferta.cantidad_regalo ?? 1;
      if (cantidad < min) break;
      const sets = Math.floor(cantidad / min);
      const unidadesGratis = sets * regalo;
      const descBogo = +(unidadesGratis * precioUnitario).toFixed(2);
      return { precioConDescuento: precioUnitario, descuento: descBogo };
    }
  }

  return { precioConDescuento: precioUnitario, descuento: 0 };
}
