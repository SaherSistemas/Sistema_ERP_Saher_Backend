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

export const TIPO_ALCANCE_VALUES = [
  "GRUPO_EMPRESA",
  "EMPRESA",
  "PRODUCTO",
  "CATEGORIA",
  "TIPO_CLIENTE",
  "METODO_PAGO",
] as const;

export type TipoAlcance = (typeof TIPO_ALCANCE_VALUES)[number];

export const NIVEL_APLICACION_VALUES = ["ITEM", "TICKET", "BUNDLE"] as const;
export type NivelAplicacion = (typeof NIVEL_APLICACION_VALUES)[number];

export const MODO_ALCANCE_VALUES = ["INCLUDE", "EXCLUDE"] as const;
export type ModoAlcance = (typeof MODO_ALCANCE_VALUES)[number];

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
    type: DataType.ENUM(...(TIPO_ALCANCE_VALUES as unknown as string[])),
    allowNull: false,
  })
  declare tipo_alcance: TipoAlcance;

  @Column({
    type: DataType.UUID,
  })
  declare id_referencia: string | null;

}
export default AlcanceOfertas;
