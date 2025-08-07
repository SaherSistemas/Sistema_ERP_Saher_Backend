import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';
import Articulo from '../Articulos/Articulo';
import Lista_Precio from './Lista_Precios/Lista_Precio';

@Table({
    tableName: 'margen_especial_articulo',
    timestamps: true,
})
class Margen_Especial_Articulo extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_margen_especial_articulo: string;

    @ForeignKey(() => Lista_Precio)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_lista_precio: string;

    @ForeignKey(() => Articulo)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_articulo: string;


    @Column({
        type: DataType.DECIMAL(5, 2),
        allowNull: false,
    })
    declare margen: number;

    @Column({
        type: DataType.DATEONLY
    })
    declare fecha_vencimiento_margen: Date

    @BelongsTo(() => Lista_Precio)
    declare lista_precio: Lista_Precio;

    @BelongsTo(() => Articulo)
    declare articulO: Articulo

}

export default Margen_Especial_Articulo;
