import Colonia from '../../models/Ubicacion/Colonia';
import Ciudad from '../../models/Ubicacion/Ciudad';
import { ICreateColonia, IColonia, IUpdateColonia } from '../../interface/Lugares/Colonia.interface';
import { v4 as uuidv4 } from 'uuid';
import { Op, UniqueConstraintError } from 'sequelize';
import { isUUID } from '../../utils/validaciones';
import { CiudadRepository } from './Ciudad.repository';
import { patronBusqueda } from '../../utils/busqueda';

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

  // Listado paginado para el catálogo (hay miles de colonias): busca por nombre, código postal o ciudad
  getPaginadas: async (page: number, limit: number, q: string) => {
    const busqueda = q.trim();
    const where: any = {};
    if (busqueda) {
      const like = patronBusqueda(busqueda);
      where[Op.or] = [
        { nom_colonia: { [Op.iLike]: like } },
        { cp_colonia: { [Op.iLike]: `${busqueda}%` } },
        { '$ciudad.nom_ciuda$': { [Op.iLike]: like } },
      ];
    }
    const { rows, count } = await Colonia.findAndCountAll({
      where,
      include: [{ model: Ciudad, attributes: ['id_ciuda', 'nom_ciuda'], required: false }],
      order: [['nom_colonia', 'ASC'], ['id_intcolonia', 'ASC']],
      limit,
      offset: (page - 1) * limit,
      subQuery: false,
    });
    return { items: rows, total: count };
  },

  // Colonias activas de un código postal (con su ciudad), para buscar la ubicación de un cliente por CP
  getColoniasPorCP: async (cp: string) => {
    return await Colonia.findAll({
      where: { cp_colonia: cp, activa_colonia: true },
      include: [{ model: Ciudad, attributes: ['id_ciuda', 'nom_ciuda'] }],
      order: [['nom_colonia', 'ASC']],
    });
  },

  getColoniasPorCiudad: async (id_ciuda: string): Promise<IColonia[]> => {

    return await Colonia.findAll({ where: { id_ciuda_colonia: id_ciuda } });
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
