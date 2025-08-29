// src/contracts/Compras/types.ts
export type FechaISO = string;            // ej. "2025-08-28T20:51:30.776Z"
export type EstadoCompra = 'R' | 'A' | 'F' | 'D' | 'M' | 'Z';


//COMPRA GENERAL 
/*
       Código	      Estado	                             Descripción
       C	        CAPTURANDO	                             La compra está en proceso, aún sin finalizar.
       A            CAPTURADA                                La captura ha sido completada pero aun no se ha enviado al proveedor.
       F	        COMPLETADA	                             Fue recibido y se cerró la compra.
       D            COMPLETADA PERO CON DEVOLUCION           La compra fue completada pero tiene devolucion.    
*/
export type EstadoCompraGeneral = 'C' | 'A' | 'F' | 'D';