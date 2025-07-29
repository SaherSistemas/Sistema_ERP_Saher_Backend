import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';

import Lista_Precios from './Lista_Precios/Lista_Precio';
import Categoria_Articulo from '../Articulos/Categoria_Articulo';
import Presentacion_Articulo from '../Articulos/Presentacion_Articulo';

@Table({
    tableName: 'margen_ganancia_lista',
    timestamps: true,
    indexes: [
        {
            unique: true,
            name: 'unique_margen_ganancia',
            fields: ['id_lista_precio', 'id_categoria', 'id_presentacion'],
        },
    ],
})
class Margen_Ganancia_Lista extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_margen: string;

    @ForeignKey(() => Lista_Precios)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_lista_precio: string;

    @ForeignKey(() => Categoria_Articulo)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_categoria: string;

    @ForeignKey(() => Presentacion_Articulo)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_presentacion: string;

    @Column({
        type: DataType.DECIMAL(5, 2),
        allowNull: false,
    })
    declare margen: number;

    @BelongsTo(() => Lista_Precios)
    declare lista_precio: Lista_Precios;

    @BelongsTo(() => Categoria_Articulo)
    declare categoria: Categoria_Articulo;

    @BelongsTo(() => Presentacion_Articulo)
    declare presentacion: Presentacion_Articulo;
}

export default Margen_Ganancia_Lista;
