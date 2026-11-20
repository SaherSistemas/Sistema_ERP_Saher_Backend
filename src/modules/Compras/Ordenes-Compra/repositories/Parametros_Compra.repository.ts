import { ICreateOrUpdateParametros_Compra } from "../interface/Parametros_Compra/Parametros_Compra.interface";

import { v4 as uuidv4 } from 'uuid';
import Empresa_Sucursal from "../../../../models/Empresa_Sucursal/Empresa_Sucursal";

import Parametros_Compra from "../model/Parametros_Compra";
import ArticuloExcluidoCompra from "../model/ArticuloExcluidoCompra";
import CategoriaExcluidaCompra from "../model/CategoriaExcluidaCompra";
import Categoria_Articulo from "../../../Catalogos/Articulos/model/Categoria_Articulo";
import Articulo from "../../../Catalogos/Articulos/model/Articulo";
import EmpresaVigiladaCompra from "../model/EmpresaVigiladaCompra";
import TipoVigiladoCompra from "../model/TipoVigiladoCompra";
import Tipo_Articulo from "../../../Catalogos/Articulos/model/Tipo_Articulo";
import { dbLocal, dbPoly } from "../../../../config/db";
import { QueryTypes } from "sequelize";

// Días hacia atrás en los que se busca una venta del artículo en las empresas vigiladas
export const DIAS_VENTA_EMPRESA_VIGILADA = 90;

const incluirEmpresasVigiladas = {
    model: EmpresaVigiladaCompra,
    attributes: ['id_empresa_vigilada'],
    include: [{ model: Empresa_Sucursal, attributes: ['id_empre', 'nom_empre'] }]
};

const incluirTiposVigilados = {
    model: TipoVigiladoCompra,
    attributes: ['id_tipo_art'],
    include: [{ model: Tipo_Articulo, attributes: ['id_tipo_art', 'nom_tipo_art'] }]
};

export const Parametros_CompraRepository = {
    getAll: async () => {
        return await Parametros_Compra.findAll({
            include: [
                {
                    model: CategoriaExcluidaCompra,
                    attributes: ['id_categoria_art'] // solo este campo
                },
                {
                    model: ArticuloExcluidoCompra,
                    attributes: ['id_articulo'] // solo este campo
                },
                {
                    model: Empresa_Sucursal,
                    attributes: ['id_empre', 'nom_empre']
                }

            ]
        });
    },

    getByID: async (id: string) => {
        return await Parametros_Compra.findByPk(id, {
            include:
                [
                    incluirEmpresasVigiladas,
                    incluirTiposVigilados,
                    {
                        model: Empresa_Sucursal,
                        attributes: ['id_empre', 'nom_empre']
                    },
                    {

                        model: CategoriaExcluidaCompra,
                        attributes: ['id_categoria_art'],
                        include: [
                            {
                                model: Categoria_Articulo,
                                attributes: ['id_categoria', 'nom_categoria']
                            }
                        ]
                    },
                    {
                        model: ArticuloExcluidoCompra,
                        attributes: ['id_articulo'],
                        include: [
                            {
                                model: Articulo,
                                attributes: ['id_artic', 'des_artic', 'cod_barr_artic']
                            }
                        ]
                    }
                ]
        });
    },
    getByIDEmpresa: async (idEmpresa: string) => {
        const parametro = await Parametros_Compra.findOne({
            where: { id_empresa: idEmpresa }
        })

        const id_parametro_comp = parametro.id_parametro_comp
        return await Parametros_Compra.findByPk(id_parametro_comp, {
            include:
                [
                    incluirEmpresasVigiladas,
                    incluirTiposVigilados,
                    {
                        model: Empresa_Sucursal,
                        attributes: ['id_empre', 'nom_empre']
                    },
                    {

                        model: CategoriaExcluidaCompra,
                        attributes: ['id_categoria_art'],
                        include: [
                            {
                                model: Categoria_Articulo,
                                attributes: ['id_categoria', 'nom_categoria']
                            }
                        ]
                    },
                    {
                        model: ArticuloExcluidoCompra,
                        attributes: ['id_articulo'],
                        include: [
                            {
                                model: Articulo,
                                attributes: ['id_artic', 'des_artic', 'cod_barr_artic']
                            }
                        ]
                    }
                ]
        });
    },

    /**
     * Para los artículos dados, en cuáles de las empresas vigiladas de la empresa de la compra se han vendido
     * en los últimos DIAS_VENTA_EMPRESA_VIGILADA días (neto de devoluciones). Regresa { id_artic: [{ id_empresa, nombre, piezas, ultima_venta }] }
     * y solo trae los artículos que sí tienen venta en alguna.
     */
    ventasEnEmpresasVigiladas: async (idEmpresaCompra: string, idsArticulos: string[]) => {
        const resultado: Record<string, { id_empresa: string; nombre: string; piezas: number; ultima_venta: string | null }[]> = {};
        const ids = [...new Set(idsArticulos.filter(Boolean))];
        if (!ids.length) return { dias: DIAS_VENTA_EMPRESA_VIGILADA, articulos: resultado };

        const parametro = await Parametros_Compra.findOne({ where: { id_empresa: idEmpresaCompra }, attributes: ['id_parametro_comp'] });
        if (!parametro) return { dias: DIAS_VENTA_EMPRESA_VIGILADA, articulos: resultado };
        const vigiladas = await EmpresaVigiladaCompra.findAll({ where: { id_parametro_comp: parametro.id_parametro_comp }, attributes: ['id_empresa_vigilada'], raw: true });
        const idsEmpresas = vigiladas.map((v: any) => v.id_empresa_vigilada).filter((id: string) => id !== idEmpresaCompra);
        if (!idsEmpresas.length) return { dias: DIAS_VENTA_EMPRESA_VIGILADA, articulos: resultado };

        const tipos = await TipoVigiladoCompra.findAll({ where: { id_parametro_comp: parametro.id_parametro_comp }, attributes: ['id_tipo_art'], raw: true });
        const idsTipos = tipos.map((t: any) => t.id_tipo_art);
        const filtroTipo = idsTipos.length
            ? `AND k.id_articulo IN (
                    SELECT a.id_artic FROM articulo a
                    JOIN categoria_articulo c ON c.id_categoria = a.id_categoria
                    WHERE c.id_tipoproducto IN (:tipos))`
            : '';

        const filas = await dbLocal.query<any>(`
            SELECT k.id_articulo, k.id_empresa, e.nom_empre AS nombre,
                   SUM(CASE WHEN k.tipo_movimiento = 'VENTA' THEN k.cantidad_movimiento ELSE 0 END)
                 - SUM(CASE WHEN k.tipo_movimiento = 'ENTRADA' AND k.notas ILIKE 'Devolución recibida%' THEN k.cantidad_movimiento ELSE 0 END) AS piezas,
                   MAX(k.fecha) FILTER (WHERE k.tipo_movimiento = 'VENTA') AS ultima_venta
            FROM kardex_movimientos_articulos k
            JOIN empresa_sucursal e ON e.id_empre = k.id_empresa
            WHERE k.id_empresa IN (:empresas)
              AND k.id_articulo IN (:articulos)
              ${filtroTipo}
              AND k.fecha >= NOW() - (:dias * INTERVAL '1 day')
              AND (k.tipo_movimiento = 'VENTA'
                   OR (k.tipo_movimiento = 'ENTRADA' AND k.notas ILIKE 'Devolución recibida%'))
            GROUP BY k.id_articulo, k.id_empresa, e.nom_empre
            HAVING SUM(CASE WHEN k.tipo_movimiento = 'VENTA' THEN k.cantidad_movimiento ELSE 0 END)
                 - SUM(CASE WHEN k.tipo_movimiento = 'ENTRADA' AND k.notas ILIKE 'Devolución recibida%' THEN k.cantidad_movimiento ELSE 0 END) > 0
        `, { replacements: { empresas: idsEmpresas, articulos: ids, tipos: idsTipos.length ? idsTipos : [''], dias: DIAS_VENTA_EMPRESA_VIGILADA }, type: QueryTypes.SELECT }) as any[];

        // Se junta por artículo+empresa: ventas del sistema nuevo + ventas del sistema anterior (sucursales)
        const acum = new Map<string, { id_articulo: string; id_empresa: string; nombre: string; piezas: number; ultima: Date | null }>();
        const sumar = (id_articulo: string, id_empresa: string, nombre: string, piezas: number, ultima: Date | null) => {
            const key = id_articulo + '|' + id_empresa;
            const a = acum.get(key) ?? { id_articulo, id_empresa, nombre, piezas: 0, ultima: null };
            a.piezas += piezas;
            if (ultima && (!a.ultima || ultima > a.ultima)) a.ultima = ultima;
            acum.set(key, a);
        };
        for (const f of filas) sumar(f.id_articulo, f.id_empresa, f.nombre, Number(f.piezas), f.ultima_venta ? new Date(f.ultima_venta) : null);

        // Las farmacias/sucursales siguen vendiendo en el sistema anterior: su venta de mostrador (SVM) vive en dbPoly.kardex,
        // ligada a la empresa por id_empresa_sys_anterior y al artículo por cod_int_artic.
        try {
            const empresas = await Empresa_Sucursal.findAll({
                where: { id_empre: idsEmpresas },
                attributes: ['id_empre', 'nom_empre', 'id_empresa_sys_anterior'],
                raw: true,
            }) as any[];
            const empPorCodigo = new Map<number, { id_empre: string; nom_empre: string }>();
            for (const e of empresas) {
                const cod = Number(e.id_empresa_sys_anterior);
                if (Number.isFinite(cod) && cod > 0) empPorCodigo.set(cod, { id_empre: e.id_empre, nom_empre: String(e.nom_empre).trim() });
            }
            // Solo artículos de los tipos elegidos (si no hay ninguno, todos) — mismo criterio que la consulta del sistema nuevo
            const articulos = await dbLocal.query<any>(`
                SELECT a.id_artic, a.cod_int_artic
                FROM articulo a
                JOIN categoria_articulo c ON c.id_categoria = a.id_categoria
                WHERE a.id_artic IN (:ids)
                  ${idsTipos.length ? 'AND c.id_tipoproducto IN (:tipos)' : ''}
            `, { replacements: { ids, tipos: idsTipos.length ? idsTipos : [''] }, type: QueryTypes.SELECT }) as any[];
            const idPorCodigo = new Map<number, string>();
            for (const a of articulos) {
                const cod = Number(a.cod_int_artic);
                if (Number.isFinite(cod)) idPorCodigo.set(cod, a.id_artic);
            }
            if (empPorCodigo.size && idPorCodigo.size) {
                const legacy = await dbPoly.query<any>(`
                    SELECT m.artcdartn::int AS cod, m.empcdempn::int AS emp,
                           COALESCE(SUM(m.kdxcantin), 0)::float AS pz, MAX(m.kdxfechad) AS ultima
                    FROM public.kardex m
                    WHERE TRIM(UPPER(m.tmocdtpoc)) = 'SVM'
                      AND m.empcdempn IN (:empresas)
                      AND m.artcdartn IN (:articulos)
                      AND m.kdxfechad >= NOW() - (:dias * INTERVAL '1 day')
                    GROUP BY m.artcdartn, m.empcdempn
                `, {
                    replacements: { empresas: [...empPorCodigo.keys()], articulos: [...idPorCodigo.keys()], dias: DIAS_VENTA_EMPRESA_VIGILADA },
                    type: QueryTypes.SELECT,
                }) as any[];
                for (const f of legacy) {
                    const emp = empPorCodigo.get(Number(f.emp));
                    const idArt = idPorCodigo.get(Number(f.cod));
                    if (!emp || !idArt) continue;
                    sumar(idArt, emp.id_empre, emp.nom_empre, Number(f.pz), f.ultima ? new Date(f.ultima) : null);
                }
            }
        } catch (err: any) {
            // Si el sistema anterior no responde, el aviso sigue con lo del sistema nuevo
            console.error('[ventasEnEmpresasVigiladas] No se pudo consultar el sistema anterior:', err.message);
        }

        for (const a of acum.values()) {
            if (a.piezas <= 0) continue;
            (resultado[a.id_articulo] ??= []).push({
                id_empresa: a.id_empresa,
                nombre: a.nombre,
                piezas: Math.round(a.piezas * 100) / 100,
                ultima_venta: a.ultima ? a.ultima.toISOString() : null,
            });
        }
        for (const lista of Object.values(resultado)) lista.sort((x, y) => y.piezas - x.piezas);
        return { dias: DIAS_VENTA_EMPRESA_VIGILADA, articulos: resultado };
    },

    createParametroCompra: async (data: ICreateOrUpdateParametros_Compra) => {
        // 1. Crear Parametro principal
        const parametro = await Parametros_Compra.create({
            id_parametro_comp: uuidv4(),
            id_empresa: data.id_empresa,
            considerar_temporabilidad: data.considerar_temporabilidad,
            ventana_dias: data.ventana_dias,
            dias_a_comprar: data.dias_a_comprar
        });

        // 2. Crear categorías excluidas si existen
        if (data.categoria_excluida?.length) {
            const categorias = data.categoria_excluida.map(cat => ({
                id_categoria_excluida: uuidv4(),
                id_parametro_comp: parametro.id_parametro_comp,
                id_categoria_art: cat.id_categoria_art
            }));
            await CategoriaExcluidaCompra.bulkCreate(categorias);
        }

        // 3. Crear artículos excluidos si existen
        if (data.articulo_excluido?.length) {
            const articulos = data.articulo_excluido.map(art => ({
                id_articulo_excluido: uuidv4(),
                id_parametro_comp: parametro.id_parametro_comp,
                id_articulo: art.id_articulo
            }));
            await ArticuloExcluidoCompra.bulkCreate(articulos);
        }

        // 4. Empresas vigiladas (nunca la propia empresa)
        const vigiladas = [...new Set((data.empresa_vigilada ?? []).map(e => e.id_empresa))].filter(id => id && id !== data.id_empresa);
        if (vigiladas.length) {
            await EmpresaVigiladaCompra.bulkCreate(vigiladas.map(id_empresa => ({
                id_empresa_vigilada_compra: uuidv4(),
                id_parametro_comp: parametro.id_parametro_comp,
                id_empresa_vigilada: id_empresa
            })));
        }

        // 5. Tipos de artículo a los que se limita el aviso
        const tiposVig = [...new Set((data.tipo_vigilado ?? []).map(t => t.id_tipo_art))].filter(Boolean);
        if (tiposVig.length) {
            await TipoVigiladoCompra.bulkCreate(tiposVig.map(id_tipo_art => ({
                id_tipo_vigilado_compra: uuidv4(),
                id_parametro_comp: parametro.id_parametro_comp,
                id_tipo_art
            })));
        }

        return parametro;
    },
    updateParametroCompra: async (id: string, data: ICreateOrUpdateParametros_Compra) => {
        const parametro = await Parametros_Compra.findByPk(id);
        if (!parametro) return null;
        // 1. Actualizar los campos principales
        await parametro.update({
            considerar_temporabilidad: data.considerar_temporabilidad,
            ventana_dias: data.ventana_dias,
            dias_a_comprar: data.dias_a_comprar,
            id_empresa: data.id_empresa,
        });

        // ========== CATEGORÍAS EXCLUIDAS ==========
        const existentesCat = await CategoriaExcluidaCompra.findAll({
            where: { id_parametro_comp: id },
            attributes: ['id_categoria_art']
        });

        const actualesCat = existentesCat.map(e => e.id_categoria_art);
        const nuevasCat = data.categoria_excluida?.map(cat => cat.id_categoria_art) || [];

        const aAgregarCat = nuevasCat.filter(id => !actualesCat.includes(id));
        const aEliminarCat = actualesCat.filter(id => !nuevasCat.includes(id));

        // Agregar nuevas categorías
        if (aAgregarCat.length > 0) {
            await CategoriaExcluidaCompra.bulkCreate(
                aAgregarCat.map(idCat => ({
                    id_categoria_excluida: uuidv4(),
                    id_parametro_comp: id,
                    id_categoria_art: idCat
                }))
            );
        }

        // Eliminar las categorías que ya no deben estar
        if (aEliminarCat.length > 0) {
            await CategoriaExcluidaCompra.destroy({
                where: {
                    id_parametro_comp: id,
                    id_categoria_art: aEliminarCat
                }
            });
        }

        // ========== ARTÍCULOS EXCLUIDOS ==========
        const existentesArt = await ArticuloExcluidoCompra.findAll({
            where: { id_parametro_comp: id },
            attributes: ['id_articulo']
        });

        const actualesArt = existentesArt.map(e => e.id_articulo);
        const nuevosArt = data.articulo_excluido?.map(a => a.id_articulo) || [];

        const aAgregarArt = nuevosArt.filter(id => !actualesArt.includes(id));
        const aEliminarArt = actualesArt.filter(id => !nuevosArt.includes(id));

        // Agregar nuevos artículos
        if (aAgregarArt.length > 0) {
            await ArticuloExcluidoCompra.bulkCreate(
                aAgregarArt.map(idArt => ({
                    id_articulo_excluido: uuidv4(),
                    id_parametro_comp: id,
                    id_articulo: idArt
                }))
            );
        }

        // Eliminar los artículos que ya no deben estar
        if (aEliminarArt.length > 0) {
            await ArticuloExcluidoCompra.destroy({
                where: {
                    id_parametro_comp: id,
                    id_articulo: aEliminarArt
                }
            });
        }
        // ========== EMPRESAS VIGILADAS ==========
        const existentesVig = await EmpresaVigiladaCompra.findAll({
            where: { id_parametro_comp: id },
            attributes: ['id_empresa_vigilada']
        });
        const actualesVig = existentesVig.map(e => e.id_empresa_vigilada);
        const nuevasVig = [...new Set((data.empresa_vigilada ?? []).map(e => e.id_empresa))].filter(e => e && e !== parametro.id_empresa);

        const aAgregarVig = nuevasVig.filter(e => !actualesVig.includes(e));
        const aEliminarVig = actualesVig.filter(e => !nuevasVig.includes(e));
        if (aAgregarVig.length > 0) {
            await EmpresaVigiladaCompra.bulkCreate(aAgregarVig.map(idEmp => ({
                id_empresa_vigilada_compra: uuidv4(),
                id_parametro_comp: id,
                id_empresa_vigilada: idEmp
            })));
        }
        if (aEliminarVig.length > 0) {
            await EmpresaVigiladaCompra.destroy({
                where: { id_parametro_comp: id, id_empresa_vigilada: aEliminarVig }
            });
        }

        // ========== TIPOS DE ARTÍCULO VIGILADOS ==========
        const existentesTipo = await TipoVigiladoCompra.findAll({
            where: { id_parametro_comp: id },
            attributes: ['id_tipo_art']
        });
        const actualesTipo = existentesTipo.map(e => e.id_tipo_art);
        const nuevosTipo = [...new Set((data.tipo_vigilado ?? []).map(t => t.id_tipo_art))].filter(Boolean);
        const aAgregarTipo = nuevosTipo.filter(t => !actualesTipo.includes(t));
        const aEliminarTipo = actualesTipo.filter(t => !nuevosTipo.includes(t));
        if (aAgregarTipo.length > 0) {
            await TipoVigiladoCompra.bulkCreate(aAgregarTipo.map(id_tipo_art => ({
                id_tipo_vigilado_compra: uuidv4(),
                id_parametro_comp: id,
                id_tipo_art
            })));
        }
        if (aEliminarTipo.length > 0) {
            await TipoVigiladoCompra.destroy({
                where: { id_parametro_comp: id, id_tipo_art: aEliminarTipo }
            });
        }

        // Forzar update de updatedAt
        await Parametros_Compra.update(
            { updatedAt: new Date() },
            { where: { id } }
        );

        const actualizado = await Parametros_Compra.findByPk(id);
        return actualizado;

    }

}