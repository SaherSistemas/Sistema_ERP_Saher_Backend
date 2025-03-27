import { Sequelize } from "sequelize-typescript";
import dotenv from 'dotenv';

dotenv.config();
export const db = new Sequelize({
    dialect: 'postgres', // O 'mysql', dependiendo de tu base de datos
    host: 'localhost', // El host de tu base de datos local
    username: process.env.DB_USER, // El usuario de tu base de datos, puedes cargarlo desde tu archivo .env
    password: process.env.DB_PASSWORD, // La contraseña de tu base de datos, también desde .env
    database: process.env.DB_NAME, // El nombre de la base de datos
    port: 5433, // Puerto de tu base de datos
    models: [__dirname + '/../models**/*'], // Rutas de tus modelos
    logging: false, // Opcional, para desactivar los logs SQL
});
