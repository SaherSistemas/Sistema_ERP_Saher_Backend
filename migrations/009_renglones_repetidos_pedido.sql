-- 009: renglones repetidos del mismo artículo en un pedido
--
-- Causa: el guardado automático de la web (cada 2 s) se empalmaba con otro guardado y el servidor creaba dos veces el mismo
-- renglón. El código ya lo evita (guardado con bloqueo y un artículo = un renglón). Este script limpia lo que ya quedó y,
-- al final, impide que vuelva a pasar desde la base de datos.
--
-- Correr los pasos EN ORDEN, uno por uno, en cada base de datos.

-- ───────────────────────── PASO 1 · Ver qué hay (solo consulta) ─────────────────────────
SELECT p.cod_int_pedido_alm, p.status_pedido_alm, p.fecha_facturado_pedido_alm IS NOT NULL AS facturado,
       a.cod_int_artic, a.des_artic,
       COUNT(*)            AS renglones,
       SUM(d.cant_pedida)  AS piezas_totales,
       STRING_AGG(d.cant_pedida::text || ' @ ' || COALESCE(d.precio_venta::text, '—'), ' | ') AS detalle
FROM detalle_pedido_almacen d
JOIN pedido_almacen p ON p.id_pedido_alm = d.id_pedido_almacen
JOIN articulo a       ON a.id_artic = d.id_articulo
GROUP BY p.cod_int_pedido_alm, p.status_pedido_alm, p.fecha_facturado_pedido_alm, a.cod_int_artic, a.des_artic, d.id_pedido_almacen, d.id_articulo
HAVING COUNT(*) > 1
ORDER BY p.cod_int_pedido_alm;

-- ───────────────────────── PASO 2 · Limpiar renglones IDÉNTICOS (opcional) ─────────────────────────
-- Deja UN solo renglón cuando hay dos o más con la misma cantidad y el mismo precio (así los dejaba el empalme de guardados).
-- Solo toca pedidos SIN facturar, en captura / cotización / capturado, y renglones SIN trabajo de almacén (lotes, chequeo,
-- asignación o negados). Los que tengan trabajo de almacén, o cantidades distintas, se arreglan a mano.
-- Revisa el PASO 1 antes: si de verdad querían pedir dos veces lo mismo, no corras este paso para ese pedido.
WITH repetidos AS (
    SELECT d.id_detalle_pedido_almacen,
           ROW_NUMBER() OVER (
               PARTITION BY d.id_pedido_almacen, d.id_articulo, d.cant_pedida, d.precio_venta
               ORDER BY d.id_detalle_pedido_almacen
           ) AS rn
    FROM detalle_pedido_almacen d
    JOIN pedido_almacen p ON p.id_pedido_alm = d.id_pedido_almacen
    WHERE p.fecha_facturado_pedido_alm IS NULL
      AND p.status_pedido_alm IN ('EC', 'CO', 'CA')
      AND NOT EXISTS (SELECT 1 FROM detalle_pedido_almacen_lote       x WHERE x.id_detalle_pedido_almacen = d.id_detalle_pedido_almacen)
      AND NOT EXISTS (SELECT 1 FROM detalle_pedido_almacen_chequeo    x WHERE x.id_detalle_pedido_almacen = d.id_detalle_pedido_almacen)
      AND NOT EXISTS (SELECT 1 FROM detalle_pedido_almacen_asignacion x WHERE x.id_detalle_pedido_almacen = d.id_detalle_pedido_almacen)
      AND NOT EXISTS (SELECT 1 FROM detalle_pedido_negado             x WHERE x.id_detalle_pedido_almacen = d.id_detalle_pedido_almacen)
)
DELETE FROM detalle_pedido_almacen
WHERE id_detalle_pedido_almacen IN (SELECT id_detalle_pedido_almacen FROM repetidos WHERE rn > 1);

-- ───────────────────────── PASO 3 · Impedirlo desde la base de datos ─────────────────────────
-- Solo se crea si ya no queda ningún pedido con el mismo artículo repetido (incluidos los ya facturados); si queda alguno, avisa
-- cuál y no hace nada. Corrige esos pedidos y vuelve a correr SOLO este paso.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM detalle_pedido_almacen GROUP BY id_pedido_almacen, id_articulo HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Todavía hay pedidos con el mismo artículo repetido: corrígelos (ver PASO 1) y vuelve a correr este paso.';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS ux_detalle_pedido_articulo
            ON detalle_pedido_almacen (id_pedido_almacen, id_articulo);
    END IF;
END $$;
