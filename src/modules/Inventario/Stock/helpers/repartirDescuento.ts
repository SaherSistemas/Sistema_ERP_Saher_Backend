// Reparte el descuento de un lote entre sus filas de stock_ubicacion_lote al facturar. Es una función pura (sin base de
// datos) para poder probarla: lo importante es que la EXISTENCIA baje exactamente lo que se factura.

export interface FilaStockDescuento {
    id: string;
    cantidad: number;
    apartada: number;
    sinUbicacion: boolean;
}

export interface ResultadoDescuento {
    /** Valores finales de cada fila (solo las que cambiaron) */
    cambios: Array<{ id: string; cantidad: number; apartada: number }>;
    /** Piezas que se debían descontar y no había existencia para quitarlas (el stock ya estaba por debajo de lo facturado) */
    faltante: number;
    /** Piezas que realmente se quitaron de la existencia */
    descontadas: number;
}

/**
 * @param facturar    piezas que salen en la factura (se quitan de existencia y de apartado)
 * @param liberarSola piezas surtidas que no se facturaron: solo se libera su apartado, la existencia no se toca
 */
export function repartirDescuento(filas: FilaStockDescuento[], facturar: number, liberarSola = 0): ResultadoDescuento {
    const w = filas.map(f => ({ ...f, cantidad: Number(f.cantidad) || 0, apartada: Number(f.apartada) || 0, ini: { c: Number(f.cantidad) || 0, a: Number(f.apartada) || 0 } }));
    let restante = Math.max(0, facturar);
    let porApartar = restante;   // apartado que se libera junto con la salida

    // 1) De las filas con apartado (de ahí salió físicamente al surtir). El apartado se libera completo, pero la
    //    existencia solo baja lo que la fila realmente tiene: antes, una fila con más apartado que existencia "gastaba"
    //    esas piezas del descuento sin quitarlas de la existencia, y la existencia se quedaba de más.
    for (const f of [...w].sort((a, b) => b.apartada - a.apartada)) {
        if (restante <= 0 && porApartar <= 0) break;
        if (f.apartada <= 0) continue;
        const liberar = Math.min(f.apartada, porApartar);
        f.apartada -= liberar;
        porApartar -= liberar;
        const quitar = Math.min(f.cantidad, liberar, restante);
        f.cantidad -= quitar;
        restante -= quitar;
    }

    // 2) Lo que falte, de la existencia que quede: primero lo SIN UBICACIÓN (mercancía que regresó al cancelar una
    //    factura y se vuelve a facturar) y luego la fila con más existencia.
    for (const f of [...w].sort((a, b) => (a.sinUbicacion ? 0 : 1) - (b.sinUbicacion ? 0 : 1) || b.cantidad - a.cantidad)) {
        if (restante <= 0) break;
        const quitar = Math.min(f.cantidad, restante);
        if (quitar <= 0) continue;
        f.cantidad -= quitar;
        restante -= quitar;
    }

    const descontadas = Math.max(0, facturar) - restante;

    // 3) Lo surtido que no se chequeó/facturó: se libera su apartado sin tocar la existencia
    let porLiberar = Math.max(0, liberarSola);
    for (const f of [...w].sort((a, b) => b.apartada - a.apartada)) {
        if (porLiberar <= 0) break;
        const quitar = Math.min(f.apartada, porLiberar);
        if (quitar <= 0) continue;
        f.apartada -= quitar;
        porLiberar -= quitar;
    }

    return {
        cambios: w.filter(f => f.cantidad !== f.ini.c || f.apartada !== f.ini.a).map(f => ({ id: f.id, cantidad: f.cantidad, apartada: f.apartada })),
        faltante: restante,
        descontadas,
    };
}
