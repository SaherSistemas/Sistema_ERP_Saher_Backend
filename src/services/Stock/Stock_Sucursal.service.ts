import { ICreateOrUpdateStockSucursal, IStockSucursal } from "../../interface/Stock/Stock_Sucursal.interface";
import { ICrearEmpleado, IEmpleado, IUpdateEmpleado } from "../../interface/Usuarios/Empleado.interface";
import { StockSucursalRepository } from "../../repository/Stock/Stock_Sucursal.repository";

export const StockSucursalService = {

    getAll:async () => {
        return await StockSucursalRepository.getAll();
    },
    getAllsucursalesPorIdArticulo:async (id_artic:string) =>{
        return await StockSucursalRepository.getAllsucursalesPorIdArticulo(id_artic);
    },
    getAllArticulosporSucursal:async(id_empre:string) => {
        return await StockSucursalRepository.getAllArticulosporSucursal(id_empre);
    },
    create:async (data : ICreateOrUpdateStockSucursal)=>{
        return await StockSucursalRepository.create(data);
    }

}
