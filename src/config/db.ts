import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const dbLocal = new Sequelize({
    dialect: 'postgres',
    host: process.env.HOST || 'localhost',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    port:  5433, //5432,
=======
    port: 5433, //5432,
>>>>>>> Stashed changes
=======
    port: 5433, //5432,
>>>>>>> Stashed changes
    timezone: '+00:00',
    dialectOptions: {
        ssl: false,
        useUTC: true,
    },
    models: [path.join(__dirname, '/../models/**/*.ts')],
    logging: false,
});
