import express from 'express'
import colors from 'colors'
import morgan from 'morgan'
import cors from 'cors'
import { db } from './config/db';
import paisRouter from './routes/paisRouter'
import estadoRouter from './routes/estadoRouter'
import ciudadRouter from './routes/ciudadRouter'
import proveedorRouter from './routes/proveedorRouter'
async function connectDB() {
    try {
        await db.authenticate()
        db.sync()
        console.log(colors.blue.bold('Conexion Exitosa'))
    } catch (error) {
        console.log(error)
    }
}

connectDB();
const app = express()

app.use(cors())
app.use(morgan('dev'))

app.use(express.json())

app.use('/api/pais', paisRouter)
app.use('/api/estado', estadoRouter)
app.use('/api/ciudad', ciudadRouter)
app.use('/api/proveedor', proveedorRouter)



export default app