import { Request, Response } from 'express';
import { CatFormaPagoService } from '../../services/Catalogos/Cat_Forma_De_Pago.service';
import { Cat_Metodo_PagoService } from '../../services/Catalogos/Cat_Metodo_Pago.service';
import { Cat_Regimen_FiscalService } from '../../services/Catalogos/Cat_Regimen_Fiscal.service';
import { CatUsoCFDIService } from '../../services/Catalogos/Cat_Uso_CFDI.service';
import { PaisService } from '../../services/Lugares/pais.service';
import { AgenteService } from '../../services/Usuarios/Agente_De_Ventas/Agente.service';
import { ListaPrecioService } from '../../services/Costo_Y_Precio/Lista_Precios/Lista_Precios.service';

export const CatalogosController = {
  getAllCatalagosClienteAlmacen: async (req: Request, res: Response) => {
    try {
      // Consultar servicios existentes
      const [paises, agentes, regimenFiscal, metodosPago, formasPago, usoCFDI, listaPrecio] = await Promise.all([
        PaisService.getAllPaises(), // ← TU SERVICE
        AgenteService.getAllAgentes(), // ← TU SERVICE
        Cat_Regimen_FiscalService.getAllCat_Regimen_Fiscal(), // ← TU SERVICE
        Cat_Metodo_PagoService.getAll(), // ← TU SERVICE
        CatFormaPagoService.getAll(), // ← TU SERVICE
        CatUsoCFDIService.getAll(), // ← TU SERVICE
        ListaPrecioService.getAll()
      ]);

      const data = {
        paises,
        agentes,
        regimenFiscal,
        metodosPago,
        formasPago,
        usoCFDI,
        listaPrecio
      };

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error cargando catálogos' });
    }
  }
};
