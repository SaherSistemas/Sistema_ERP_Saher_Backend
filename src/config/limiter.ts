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
        // Normalizar IPv6 ::ffff:x.x.x.x → x.x.x.x para evitar bypass
        const ip = req.ip ?? 'unknown';
        return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
    },
    message: 'Demasiadas solicitudes, por favor intente de nuevo más tarde.',
    validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
});

const authLimiter = rateLimit({
    windowMs: 3 * 60 * 1000,
    max: 20,
    message: 'Demasiados intentos de inicio de sesion. Por favor intente de nuevo más tarde.'
});

export { generalLimiter, authLimiter };
