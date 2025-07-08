import { Table, Column, Model, PrimaryKey, DataType, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';


@Table({ tableName: 'lotes_recibidos_compra' })
class LotesRecibidosCompra extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_loterecibido: string;

    @Column(DataType.UUID)
    declare id_detallecompr_recibido: string;

    @Column(DataType.STRING)
    declare numerolote_lote: string;

    @Column(DataType.DATEONLY)
    declare fechavencimiento_lote: Date;

    @Column(DataType.INTEGER)
    declare cantidad_lote: Date;

    @Column(DataType.TEXT)
    declare motivo_ajuste: string

    @Column(DataType.CHAR(1))
    declare estado_lote: string

    /* |------------------------------------------------------------------------------------------------------|
       |     ESTADO_LOTE          ¿QUE SIGNIFCA?                                         ¿SE PERMITE INGRESAR INVENTARIO?        COMENTARIO    |
       |------------------------------------------------------------------------------------------------------|
       |        OK           LOTE Y CADUCIDAD CORRECTA                                              SI                  COINCIDE CON LO SOLICITADO O ACEPTABLE
       |    MODIFICADO       SE CAMBIO EL LOTE O FECHA DE CADUCIDDD PERO ES VALIDO                     SI                  EL PROVEEDOR ENVIO OTRO LOTE O FECHA PERO SE ACEPTA
       |    CADUCADO        EL LOTE ESTA VENCIDO O POR CADUCAR MUY PRONTO                                NO      DEBE IR A NEGADOS O DEVOLUCION DEPENDIENDO
       |    DAÑADO          PRODUCTO ROTO, GOLPEADO O DEFECTUOSO                                        NO          TAMBIEN VA A NEGADOS O DEVOLUCION
       |    RECHAZADO       NO SE ACEPTA POR CUALQUIER COSA GRAVE                                       NO          LOTE RECHAZADO COMPLEMANTE , NO ENTRA AL INVENTARIO
    */
}

export default LotesRecibidosCompra;
