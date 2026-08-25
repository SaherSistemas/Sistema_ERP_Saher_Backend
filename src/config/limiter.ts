import { rateLimit } from 'express-rate-limit';

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    keyGenerator: (req) => {
        const auth = req.headers.authorization;
        if (auth?.startsWith('Bearer ')) {
            try {
                const payload = JSON.parse(
                    Buffer.from(auth.split('.')[1], 'base64').toString()
                );
                if (payload?.id) return `user_${payload.id}`;
            } catch {}
        }
        return req.ip ?? 'unknown';
    },
    message: 'Demasiadas solicitudes, por favor intente de nuevo más tarde.',
});

const authLimiter = rateLimit({
    windowMs: 3 * 60 * 1000,
    max: 20,
    message: 'Demasiados intentos de inicio de sesion. Por favor intente de nuevo más tarde.'
});

export { generalLimiter, authLimiter };
