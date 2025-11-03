import { rateLimit } from 'express-rate-limit';

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 400, // Limit each IP to 400 requests per windowMs
    message: 'Demasiados solicitudes, por favor intente de nuevo más tarde.'
});

const authLimiter = rateLimit({
    windowMs: 3 * 60 * 1000,
    max: 5,
    message: 'Demasiados intentos de inicio de sesion. Por favor intente de nuevo más tarde.'
});

export { generalLimiter, authLimiter };
