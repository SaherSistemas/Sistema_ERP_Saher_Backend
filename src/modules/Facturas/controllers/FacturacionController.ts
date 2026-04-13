import type { Response } from 'express';
import type { AuthedRequest } from '../../../middleware/auth';
import { FacturacionService } from '../services/Facturacion.service';

export class FacturacionController {

    static generarTxt = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_pedido_alm } = req.params;
            const id_empresa = req.user?.id_empresa;

            const resultado = await FacturacionService.generarTxt(id_pedido_alm, id_empresa);
            res.status(201).json(resultado);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message ?? 'Error desconocido' });
        }
    };
}
