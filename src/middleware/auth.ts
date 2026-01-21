import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface JwtPayloadCustom {
    id_user: string;
    username: string;
    iat: number;
    exp: number;
}

export type AuthedRequest = Request & { user?: JwtPayloadCustom; token?: string };

export const authMiddleware = (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({ message: "Token requerido" });
        return;
    }

    const isBearer = authHeader.startsWith("Bearer ");
    const token = isBearer ? authHeader.slice(7).trim() : authHeader.trim();

    if (!token) {
        res.status(401).json({ message: "Token requerido" });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayloadCustom;

        // ✅ aquí “regresas” el objeto (pero hacia el request)
        req.user = decoded;
        req.token = token;

        next();
        return;
    } catch (err: any) {
        res.status(401).json({ message: "Token inválido" });
        return;
    }
};
