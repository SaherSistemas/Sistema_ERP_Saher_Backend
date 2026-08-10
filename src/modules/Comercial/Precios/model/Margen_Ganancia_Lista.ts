import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';

import Lista_Precios from './Lista_Precio';
import Tipo_Articulo from '../../../Catalogos/Articulos/model/Tipo_Articulo';
import Presentacion_Articulo from '../../../Catalogos/Articulos/model/Presentacion_Articulo';

@Table({
    tableName: 'margen_ganancia_lista',
    timestamps: true,
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

    @ForeignKey(() => Tipo_Articulo)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare id_tipo_art: string;

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

    @BelongsTo(() => Tipo_Articulo)
    declare tipo_art: Tipo_Articulo;

    @BelongsTo(() => Presentacion_Articulo)
    declare presentacion: Presentacion_Articulo;
}

export default Margen_Ganancia_Lista;
