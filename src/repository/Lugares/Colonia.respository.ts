import Colonia from '../../models/Ubicacion/Colonia';
import Ciudad from '../../models/Ubicacion/Ciudad';
import { ICreateColonia, IColonia, IUpdateColonia } from '../../interface/Lugares/Colonia.interface';
import { v4 as uuidv4 } from 'uuid';
import { Op, UniqueConstraintError } from 'sequelize';
import { isUUID } from '../../utils/validaciones';
import { CiudadRepository } from './Ciudad.repository';

export const ColoniaRepository = {
  getAll: async (): Promise<IColonia[]> => {
    return await Colonia.findAll({
      include: [{ model: Ciudad, attributes: ['id_ciuda', 'nom_ciuda'] }]
    });
  },
  getColoniasActivas: async (): Promise<IColonia[]> => {
    return await Colonia.findAll({
      where: { activa_colonia: true }
    });
  },

  getColoniasPorCiudad: async (id_ciuda: string): Promise<IColonia[]> => {
    const ciudad = await CiudadRepository.findByIdFlexible(id_ciuda);

    if (!ciudad) return [];

    return await Colonia.findAll({ where: { id_ciuda_colonia: ciudad.id_ciuda } });
  },

  findByIdFlexible: async (id: string): Promise<Colonia | null> => {
    if (isUUID(id)) {
      return await Colonia.findByPk(id, {
        include: [{ model: Ciudad, attributes: ['id_ciuda', 'nom_ciuda'] }]
      });
    } else if (!isNaN(Number(id))) {
      return await Colonia.findOne({
        where: { id_intcolonia: Number(id) },
        include: [{ model: Ciudad, attributes: ['id_ciuda', 'nom_ciuda'] }]
      });
    } else {
      return await Colonia.findOne({
        where: { nom_colonia: { [Op.iLike]: id } },
        include: [{ model: Ciudad, attributes: ['id_ciuda', 'nom_ciuda'] }]
      });
    }
    return null;
  },

  ultimoID: async () => {
    return await Colonia.findOne({
      order: [['id_intcolonia', 'DESC']]
    });
  },

  create: async (data: ICreateColonia) => {
    const nuevoUUID = uuidv4();
    const ultimoID = await ColoniaRepository.ultimoID();
    const nuevoIntID = ultimoID ? ultimoID.id_intcolonia + 1 : 1;
    console.log(nuevoUUID);
    console.log(nuevoIntID);

    return await Colonia.create({
      id_colonia: nuevoUUID,
      id_intcolonia: nuevoIntID,
      ...data
    });
  },

  updateColonia: async (id: string, data: IUpdateColonia) => {
    const colonia = await ColoniaRepository.findByIdFlexible(id);
    if (!colonia) return null;
    return await colonia.update(data);
  },
  cambiarStatus: async (id: string, statusContrario: boolean) => {
    const colonia = await ColoniaRepository.findByIdFlexible(id);
    if (!colonia) return null;
    return await colonia.update({ activa_colonia: statusContrario });
  },

  statusActualColonia: async (id: string) => {
    const colonia = await ColoniaRepository.findByIdFlexible(id);
    if (!colonia) return null;
    return colonia.activa_colonia;
  }
};
