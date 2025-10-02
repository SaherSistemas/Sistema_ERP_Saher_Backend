export interface IRecetaArticulo {
  id_receta_articulo: string | null;
  id_receta: string | null;                
  id_artic: string | null;              
  dosis?: string | null;           
  cantidad_prescrita?: number | null; 
  indicaciones?: string | null;    
  sustitucion_permitida?: boolean;  
  id_detalle_venta?: string | null; 
}


export interface ICreateOrUpdateRecetaArticulo {
  id_receta: string;                
  id_artic: string;              
  dosis?: string | null;           
  cantidad_prescrita?: number | null; 
  indicaciones?: string | null;    
  sustitucion_permitida?: boolean; 
  id_detalle_venta?: string | null; 
}
