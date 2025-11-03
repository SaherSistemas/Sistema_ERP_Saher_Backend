import Jwt from "jsonwebtoken";

export const generateToken = (id_user: string, username: string) => {
    const token = Jwt.sign({ id_user, username }, process.env.JWT_SECRET, {
        expiresIn: '8h'
    })
    return token
}