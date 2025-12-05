import { EmpleadoRepository } from '../../repository/Usuarios/Empleado.repository';
import { UsuarioRepository } from '../../repository/Usuarios/Usuario.repository';
import { checkPassword, hashPassword } from '../../utils/hashPassword';
import { generateToken } from '../../utils/jwt';
import { generarUsernameUnico } from '../../utils/posiblesUsernames';
import { isUUID } from '../../utils/validaciones';
import bcrypt from 'bcrypt';
export const UsuarioService = {
  getByID: async (id: string, idrol_user: string) => {
    //TRAER PERSONA
    if (idrol_user === '1' || idrol_user === '2') {
      const usuario = EmpleadoRepository.getByIdFlexible(id);
      return usuario;
    }
  },
  getByIDUser: async (id: string) => {
    //TRAER PERSONA
    const usuario = UsuarioRepository.findByIDEmpleado(id);
    return usuario;
  }
};
