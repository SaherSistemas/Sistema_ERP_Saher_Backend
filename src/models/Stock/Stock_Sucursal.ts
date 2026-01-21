import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, AllowNull, BelongsTo, Unique } from 'sequelize-typescript';
import Articulo from '../../modules/Inventario/Articulos/model/Articulo';
import Empresa_Sucursal from '../Empresa_Sucursal/Empresa_Sucursal';


@Table({
   tableName: 'stock_sucursal'
})

class Stock_sucursal extends Model {
   @PrimaryKey
   @Column({
      type: DataType.UUID
   })
   declare id_stockSucursal: string;

   @ForeignKey(() => Articulo)
   @Column({
      type: DataType.UUID,
      allowNull: false
   })
   declare id_artic: string;
   @BelongsTo(() => Articulo)
   declare articulo: Articulo;

   @ForeignKey(() => Empresa_Sucursal)
   @Column({
      type: DataType.UUID,
      allowNull: false
   })
   declare id_empre: string;
   @BelongsTo(() => Empresa_Sucursal)
   declare sucursal: Empresa_Sucursal;

   @Column({
      type: DataType.INTEGER,
      allowNull: false,
   })
   declare cantidad_stockSucursal: number;




}

export default Stock_sucursal;