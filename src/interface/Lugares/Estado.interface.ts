export interface IEstado {
    id_esta: string;  // 🔥 ahora es string (UUID)
    id_intesta: number; // ⚡ el id interno que es número
    id_pais_esta: string;
    nom_esta: string;
    clave_ent_fed_estado: string;
    activo_estado: boolean;
}


export interface ICreateEstado {
    id_pais_esta: string;
    nom_esta: string;
    clave_ent_fed_estado: string;
}

export interface IUpdateEstado {
    nom_esta?: string;
    clave_ent_fed_estado?: string;
    id_pais_esta?: string;
    activo_estado?: boolean;
}
