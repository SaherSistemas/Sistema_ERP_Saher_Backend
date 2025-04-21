import express from 'express'
import colors from 'colors'
import morgan from 'morgan'
import cors from 'cors'
import { dbLocal, /*dbRemota */ } from './config/db';
import router from './routes';

async function connectDBLocal() {
    try {
        await dbLocal.authenticate()
        dbLocal.sync()
        console.log(colors.blue.bold('Conexion Exitosa Local'))
    } catch (error) {
        console.log(error)
    }
}
/*
async function connectDBRemota() {
    try {
        await dbRemota.authenticate()
        dbRemota.sync()
        console.log(colors.blue.bold('Conexion Exitosa REMOTA'))
    } catch (error) {
        console.log(error)
    }
}*/

connectDBLocal();
//connectDBRemota();
const app = express()

app.use(cors())
app.use(morgan('dev'))

app.use(express.json())

app.use('/api', router)

export default app