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
import Articulo from "../../modules/Catalogos/Articulos/model/Articulo";

export const TIPO_BENEFICIO = [
  "PORCENTAJE",
  "MONTO_FIJO",
  "X_POR_Y",
  "BOGO",
  "ARTICULO_GRATIS",
  "CUPON",
] as const;
export type TipoBeneficio = (typeof TIPO_BENEFICIO)[number];

@Table({
  tableName: "regla_oferta",
})
class ReglaOferta extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
  })
  declare id_regla: string;

  @ForeignKey(() => Ofertas)
  @Column({
    type: DataType.UUID,
  })
  declare id_oferta: string;
  @BelongsTo(() => Ofertas, {
    as: 'ofertas'
  })
  oferta: Ofertas;

  @Column({
    type: DataType.ENUM(...(TIPO_BENEFICIO as unknown as string[])),
    allowNull: false,
  })
  declare tipo_beneficio: TipoBeneficio;

  @Column({
    type: DataType.DECIMAL(10, 2),
    get(this: any) {
      const raw = this.getDataValue("valor");
      return raw === null ? null : Number(raw);
    },
  })
  declare valor: number | null;

  @Column({
    type: DataType.INTEGER,
  })
  declare cantidad_minima: number | null;

  @Column({
    type: DataType.INTEGER,
  })
  declare cantidad_regalo: number | null;

  @ForeignKey(() => Articulo)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare articulo_gratis: string | null;
  @BelongsTo(() => Articulo)
  regalo: Articulo | null;

  @Column({
    type: DataType.DECIMAL(10, 2),
  })
  declare monto_minimo_total: number | null;

  @Column({
    type: DataType.INTEGER,
  })
  declare minimo_articulo: number | null;

  @Column({
    type: DataType.DECIMAL(10, 2),
    get(this: any) {
      const raw = this.getDataValue("tope_desc"); // lo que devuelve Postgres (string o null)
      return raw === null ? null : Number(raw);
    },
  }) declare tope_desc: number | null;

  @Column({
    type: DataType.INTEGER,
  }) declare cantidad_max_dias: number | null;

  @Column({
    type: DataType.STRING,
  }) declare codigo_cupon: string | null;

  @Column({
    type: DataType.INTEGER,
  }) declare max_usos_cliente: number | null;

  @Column({
    type: DataType.INTEGER,
  }) declare max_usos_global: number | null;
  @Column({
    type: DataType.BOOLEAN,
  }) declare exclusiva: boolean | null;

}
export default ReglaOferta;
