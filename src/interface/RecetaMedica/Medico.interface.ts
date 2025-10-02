
export interface IMedico {
  id_medico: string;                
  nombre_completo: string;          
  cedula_profesional: string;       
  especialidad?: string | null;     
  telefono?: string | null;         
  correo?: string | null;           
  direccion?: string | null;        
  activo: boolean;                                
}


export interface ICreateOrUpdateMedico {                
  nombre_completo: string;          
  cedula_profesional: string;       
  especialidad?: string | null;     
  telefono?: string | null;         
  correo?: string | null;           
  direccion?: string | null;        
  activo: boolean;                                
}
