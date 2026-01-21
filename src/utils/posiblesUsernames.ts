import Usuario from '../modules/Seguridad/model/Usuario';

// Función para limpiar acentos y dejar solo letras
const cleanString = (str: string) => {
    return str
        .normalize('NFD')                   // separa acentos
        .replace(/[\u0300-\u036f]/g, '')    // quita acentos
        .replace(/[^a-zA-Z]/g, '')          // quita todo lo que no sea letra
        .toLowerCase();                     // pasa a minúsculas
};

export const generarUsernameUnico = async (nombre: string, apPat: string, apMat: string) => {
    nombre = cleanString(nombre);
    apPat = cleanString(apPat);
    apMat = cleanString(apMat);

    const posiblesUsernames = [
        `${nombre[0]}${apPat}`,
        `${nombre[0]}${apMat}`,
        `${nombre.slice(0, 2)}${apPat}`,
        `${nombre.slice(0, 2)}${apMat}`,
        `${nombre[0]}${apPat}${apMat}`,
    ];

    // Verifica cuál está libre
    for (let base of posiblesUsernames) {
        const existente = await Usuario.findOne({ where: { username: base } });
        if (!existente) {
            return base;
        }
    }

    // Si todos están ocupados, agrega números al final
    let counter = 1;
    while (true) {
        const usernameTry = `${nombre[0]}${apPat}${counter}`;
        const existente = await Usuario.findOne({ where: { username: usernameTry } });
        if (!existente) {
            return usernameTry;
        }
        counter++;
    }
};
