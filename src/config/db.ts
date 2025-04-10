import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const dbLocal = new Sequelize({
    dialect: 'postgres',
    host: 'localhost',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5433,
    models: [path.join(__dirname, '/../models/**/*.ts')],  // Corrige la ruta con path.join
    logging: false,
});
//export const dbRemota = new Sequelize({
//  dialect: 'postgres',
// host: 'localhost',
// username: process.env.DB_USER,
//password: process.env.DB_PASSWORD,
//database: process.env.DB_NAME,
//port: 5433,
//models: [__dirname + '/../models/Local**/*'],
//logging: false,
//})
