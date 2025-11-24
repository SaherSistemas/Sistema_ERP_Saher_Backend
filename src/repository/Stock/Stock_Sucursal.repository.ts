import { UUID } from 'crypto';
import Stock_sucursal from '../../models/Stock/Stock_Sucursal';
import { IStockSucursal, ICreateOrUpdateStockSucursal } from '../../interface/Stock/Stock_Sucursal.interface';
import { v4 as uuidv4 } from 'uuid';
import Empresa_Sucursal from '../../models/Empresa_Sucursal/Empresa_Sucursal';
import Articulo from '../../models/Articulos/Articulo';
import LoteArticuloSucursal from '../../models/LotesYCaducidad/Lote_ArticuloSucursal';
import { Transaction } from 'sequelize'; // Asegúrate de importar Transaction

export const StockSucursalRepository = {
  getAll: async () => {
    return await Stock_sucursal.findAll();
  },

  getAllsucursalesPorIdArticulo: async (id_artic: string) => {
    return await Stock_sucursal.findAll({
      where: { id_artic: id_artic },
      include: [Empresa_Sucursal]
    });
  },

  getAllArticulosporSucursal: async (id_empre: string) => {
    return await Stock_sucursal.findAll();
  },

  create: async (data: ICreateOrUpdateStockSucursal) => {
    const nuevoUUID = uuidv4();
    return await Stock_sucursal.create({
      id_stockSucursal: nuevoUUID,
      ...data
    });
  },
  updateCantidadExistencia: async (id_empre: string, id_artic: string, options?: { transaction?: Transaction }) => {
    const lotes = await LoteArticuloSucursal.findAll({
      where: {
        id_artic,
        id_empre,
        estado_lote_sucursal: 'A' // o el estado que estés usando
      },
      transaction: options?.transaction
    });

    const total = lotes.reduce((sum, lote) => {
      return sum + lote.cantidad_lote_sucursal;
    }, 0);

    // 2. Buscar si ya existe el registro en stock_sucursal
    const registro = await Stock_sucursal.findOne({
      where: {
        id_artic,
        id_empre
      }
    });

    if (registro) {
      // 3. Actualizar la cantidad existente
      await registro.update({
        cantidad_stockSucursal: total
      });
      return registro;
    }

    // 4. Si no existe, crear un nuevo registro
    const nuevo = await Stock_sucursal.create({
      id_stockSucursal: uuidv4(),
      id_artic,
      id_empre,
      cantidad_stockSucursal: total
    });

    return nuevo;
  }
};

//     getByIDFlexible: async(id_cliente_o_telefono : string ) => {
//         if(isUUID(id_cliente_o_telefono)){
//         return await Cliente.findByPk( id_cliente_o_telefono )
//         }else{

//         return await Cliente.findOne({
//             where:{
//                  telefono_cliente:id_cliente_o_telefono
//             }
//         })}
//     },
//     createCliente: async(data:ICliente) =>{
//         return await Cliente.create({
//             id_cliente: uuidv4(),
//             ...data
//         });
//     },
//     updateCliente: async(id_cliente: string, data: ICreateUpdateCliente) => {
//         return await Cliente.update(data, {
//             where: { id_cliente }
//         });
//     },

//     updateStatusCliente: async(id_cliente: string) => {
//        const cliente = await ClienteRepository.getByIDFlexible(id_cliente);
//        let statusActualCliente = cliente?.status_cliente;
//         statusActualCliente =! statusActualCliente;
//         console.log(statusActualCliente)
//         return await cliente.update({
//             status_cliente:statusActualCliente
//         })
//     }

// }
