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



// export const NIVEL_APLICACION_VALUES = ["ITEM", "TICKET", "BUNDLE"] as const;
// export type NivelAplicacion = (typeof NIVEL_APLICACION_VALUES)[number];

// export const MODO_ALCANCE_VALUES = ["INCLUDE", "EXCLUDE"] as const;
// export type ModoAlcance = (typeof MODO_ALCANCE_VALUES)[number];

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
