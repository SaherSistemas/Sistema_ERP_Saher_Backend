import { Router } from 'express';
import { Request, Response } from 'express';
import Cat_Paqueteria from '../../Almacen/Pedido/model/Cat_Paqueteria';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const paqueterias = await Cat_Paqueteria.findAll({ where: { activo: true }, order: [['nombre_paqueteria', 'ASC']] });
  res.json(paqueterias);
});

router.post('/', async (req: Request, res: Response) => {
  const { nombre_paqueteria } = req.body;
  const nueva = await Cat_Paqueteria.create({ nombre_paqueteria });
  res.status(201).json(nueva);
});

router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await Cat_Paqueteria.update(req.body, { where: { id_paqueteria: id } });
  res.json({ ok: true });
});

export default router;
