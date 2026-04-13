
import { IEmpleado } from "../../modules/RRHH/interface/Empleado.interface";
import { ICreateOrUpdateMedico, IMedico } from "./Medico.interface";
import { IRecetaArticulo } from "./RecetaArticulo";

export interface IRecetaMedica {
  id_receta: string;
  id_medico: string;
  paciente_nombre: string;
  paciente_direccion?: string | null;
  fecha_expedicion: string;
  folio?: string | null;
  fuente?: "FISICA" | "DIGITAL" | null;
  archivo_ruta?: string | null;
  archivo_mime?: string | null;
  archivo_bytes?: number | null;
  creada_por_usuario: IEmpleado;
}

export interface ICreateOrUpdateRecetaMedica {
  id_medico: string;
  paciente_nombre: string;
  paciente_direccion?: string | null;
  fecha_expedicion: string;
  folio?: string | null;
  fuente?: "FISICA" | "DIGITAL" | null;
  archivo_ruta?: string | null;
  archivo_mime?: string | null;
  archivo_bytes?: number | null;
  creada_por_usuario: IEmpleado;
}



export interface IRecetaDesdeVenta {
  id_venta?: string;
  id_medico?: string | null;
  medico_nuevo?: {
    nombre_completo: string;
    cedula_profesional: string;
    especialidad?: string | null;
    telefono?: string | null;
    correo?: string | null;
    direccion?: string | null;
  };
  receta: {
    paciente_nombre: string;
    paciente_direccion?: string | null;
    fecha_expedicion: string;          // 'YYYY-MM-DD'
    folio?: string | null;
    fuente?: "FISICA" | "DIGITAL" | null;
    creada_por_usuario: string;
    // archivo_ruta?: string | null;
    // archivo_mime?: string | null;
    // archivo_bytes?: number | null;

    nombre_completo?: string;
    cedula_profesional?: string;
    especialidad?: string;
    telefono?: string | null;
    correo?: string | null;
    direccion?: string | null;
  };
  articulos: Array<{
    temp_line_id: string;
    indicaciones?: string | null;
    cantidad_prescrita?: number | null;
    dosis?: string | null;
    sustitucion_permitida?: boolean | null;
    id_articulo: string;
  }>;
}


