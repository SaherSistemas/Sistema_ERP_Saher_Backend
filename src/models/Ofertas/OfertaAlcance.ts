import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  ForeignKey,
  Unique,
  BelongsTo,
  Default,
  HasMany,
} from "sequelize-typescript";
import Ofertas from "./Ofertas";
import { AlcanceParams, TipoAlcance, TIPOS_ALCANCE } from "../../interface/Ofertas/AlcanceOferta.interface";



@Table({
  tableName: "alcance_oferta",
})
class AlcanceOfertas extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
  })
  declare id_alcance: string;

  @ForeignKey(() => Ofertas)
  @Column({
    type: DataType.UUID,
  })
  declare id_oferta: string;
  @BelongsTo(() => Ofertas)
  ofertas: Ofertas;

  @Column({
    type: DataType.ENUM(...(TIPOS_ALCANCE as unknown as string[])),
    allowNull: false,
  })
  declare tipo_alcance: TipoAlcance;

  @Column({
    type: DataType.UUID,
  })
  declare id_referencia: string | null;

  @Column({ 
    type: DataType.JSONB, 
    allowNull: true 
  })
  declare params: AlcanceParams;

}
export default AlcanceOfertas;
