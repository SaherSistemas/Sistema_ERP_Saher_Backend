import { UUID } from "crypto";
import Stock_sucursal from "../../models/Stock/Stock_Sucursal";
import { isUUID } from "../../utils/validaciones";
import { IStockSucursal, ICreateOrUpdateStockSucursal  } from "../../interface/Stock/Stock_Sucursal.interface";
import { v4 as uuidv4 } from "uuid";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";
import Articulo from "../../models/Articulos/Articulo";

export const StockSucursalRepository = {
        getAll:async () => {
            return await Stock_sucursal.findAll();
        },

        getAllsucursalesPorIdArticulo:async(id_artic:string) => {
            return await Stock_sucursal.findAll({
                where : {id_artic : id_artic} ,
                include: [Empresa_Sucursal],
            });
        },
        
        getAllArticulosporSucursal:async(id_empre:string) => {
            return await Stock_sucursal.findAll()
        },

        create : async (data:  ICreateOrUpdateStockSucursal) => {
            const nuevoUUID = uuidv4();          
            return await Stock_sucursal.create({
                id_stockSucursal: nuevoUUID,
                ...data
            });
        },



      


}



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