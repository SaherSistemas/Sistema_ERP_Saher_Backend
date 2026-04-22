import express from 'express';
import colors from 'colors';
import morgan from 'morgan';
import cors from 'cors';
import { dbLocal, /*dbVieja/* dbRemota */ } from './config/db'; // Ambas conexiones
import router from './routes';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
    // Sequelize sync({ alter:true }) no elimina restricciones NOT NULL en Postgres.
    // Estas migraciones son idempotentes (IF EXISTS / DROP NOT NULL no falla si ya es nullable).
    const migraciones: string[] = [
        // CxC: id_factura e id_remision son opcionales según el flujo (PG vs directo)
        `ALTER TABLE cuenta_por_cobrar ALTER COLUMN id_remision DROP NOT NULL`,
        `ALTER TABLE cuenta_por_cobrar ALTER COLUMN id_factura  DROP NOT NULL`,
        // Chequeo: columnas añadidas manualmente si sync no las creó
        `ALTER TABLE detalle_pedido_almacen_chequeo ADD COLUMN IF NOT EXISTS id_detalle_pedido_almacen_lote UUID NULL`,
        `ALTER TABLE detalle_pedido_almacen_chequeo ADD COLUMN IF NOT EXISTS cant_surtida_lote INTEGER NULL`,
    ];

    for (const sql of migraciones) {
        try {
            await dbLocal.query(sql);
        } catch {
            // Ignorar errores (ej. columna ya existe, constraint ya fue eliminada)
        }
    }
}

async function seedPermisosMenu() {
    const items = [
        // Dashboard
        [100, 'dashboard', 'menu'], [101, 'dashboard', 'dashboard_general'],
        [102, 'dashboard', 'dashboard_saher'], [103, 'dashboard', 'dashboard_unisin'], [104, 'dashboard', 'dashboard_local'],
        // Personal
        [110, 'personal', 'menu'], [111, 'personal', 'empleados'], [112, 'personal', 'usuarios'],
        [113, 'personal', 'agentes'], [114, 'personal', 'gestion_permisos'],
        // Ubicacion
        [120, 'ubicacion', 'menu'], [121, 'ubicacion', 'paises'], [122, 'ubicacion', 'estados'],
        [123, 'ubicacion', 'ciudades'], [124, 'ubicacion', 'colonias'],
        // Articulos
        [130, 'articulos', 'menu'], [131, 'articulos', 'articulos'], [132, 'articulos', 'tipo_iva'],
        [133, 'articulos', 'unidad_medida'], [134, 'articulos', 'categorias'],
        [135, 'articulos', 'temporabilidad'], [136, 'articulos', 'prioridades'],
        // Proveedores
        [140, 'proveedores', 'menu'], [141, 'proveedores', 'proveedores'], [142, 'proveedores', 'dashboard_proveedores'],
        // Compras
        [150, 'compras', 'menu'], [151, 'compras', 'dashboard_compras'], [152, 'compras', 'compras'], [153, 'compras', 'parametros_compras'],
        // Chequeo
        [160, 'chequeo', 'menu'], [161, 'chequeo', 'tablero_chequeo'],
        // Empaque
        [170, 'empaque', 'menu'], [171, 'empaque', 'tablero_empaque'],
        // Costos y Precios
        [180, 'costo_y_precio', 'menu'], [181, 'costo_y_precio', 'listas_precio'],
        [182, 'costo_y_precio', 'margenes_ganancia'], [183, 'costo_y_precio', 'parametros_costo'],
        // Punto de Venta
        [190, 'punto_de_venta', 'menu'], [191, 'punto_de_venta', 'punto_de_venta'],
        // Cajas
        [200, 'cajas', 'menu'], [201, 'cajas', 'cajas'],
        // Clientes
        [210, 'clientes', 'menu'], [211, 'clientes', 'clientes'], [212, 'clientes', 'clientes_almacen'],
        // Oferta
        [220, 'oferta', 'menu'], [221, 'oferta', 'oferta'],
        // Receta Medica
        [230, 'receta_medica', 'menu'], [231, 'receta_medica', 'receta_medica'],
        // Medico
        [240, 'medico', 'menu'], [241, 'medico', 'medicos'],
        // Presupuestos
        [250, 'presupuestos', 'menu'], [251, 'presupuestos', 'presupuesto_empresa'], [252, 'presupuestos', 'asignacion_empleado'],
        // Almacen
        [260, 'almacen', 'menu'], [261, 'almacen', 'pedidos_clientes'],
        // Empresas
        [270, 'empresas', 'menu'], [271, 'empresas', 'empresas_sucursales'], [272, 'empresas', 'grupo_empresa'],
        // ── WEB CRM ──────────────────────────────────────────────────────
        [300, 'web_crm', 'menu'],
        [301, 'web_crm', 'usuarios'],
        [302, 'web_crm', 'articulos'],
        [303, 'web_crm', 'agentes'],
        [304, 'web_crm', 'clientes'],
        [305, 'web_crm', 'administradores'],
        [306, 'web_crm', 'perfil'],
        [307, 'web_crm', 'contactos'],
        [308, 'web_crm', 'pedidos'],
        [309, 'web_crm', 'mis_clientes'],
        [310, 'web_crm', 'entrega_cliente_directo'],
        [311, 'web_crm', 'cobranza'],
        [312, 'web_crm', 'recepciones'],
        [313, 'web_crm', 'recibo'],
        [314, 'web_crm', 'pedidos_por_surtir'],
        [315, 'web_crm', 'acomodar'],
        [316, 'web_crm', 'empaque'],
        [317, 'web_crm', 'ubicaciones'],
        [318, 'web_crm', 'catalogo'],
        [319, 'web_crm', 'mis_pedidos'],
    ] as [number, string, string][];

    const values = items.map(([id, mod, acc]) => `(${id}, '${mod}', '${acc}', NOW(), NOW())`).join(',\n        ');
    await dbLocal.query(`
        INSERT INTO permiso (id_permiso, modulo_permiso, accion_permiso, "createdAt", "updatedAt") VALUES
        ${values}
        ON CONFLICT (id_permiso) DO NOTHING
    `);
}

async function connectDatabases() {
    try {
        await dbLocal.authenticate();
        // await dbVieja.authenticate();
        // await dbRemota.authenticate();

        console.log(colors.blue.bold('Conexión exitosa a base LOCAL'));
        console.log(colors.green.bold('Conexión exitosa a base VIEJA'));

        await runMigrations();
        await dbLocal.sync({ alter: true });
        await seedPermisosMenu();
        //await dbLocal.sync();    // Sincroniza modelos si es necesario
        //await dbRemota.sync();   // Solo si quieres sincronizar también la remota
    } catch (error) {
        console.error(colors.red.bold('Error al conectar a las bases de datos:'));
        console.error(error);
        process.exit(1);
    }
}

connectDatabases(); // ⬅ Aquí las conecta ambas

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api', router);

app.use('/uploads/firmas', express.static(
    path.join(__dirname, 'modules/Almacen/Empaque/routes/firmas')
));
export default app;
