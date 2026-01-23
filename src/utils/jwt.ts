import Jwt from "jsonwebtoken";

export const generateToken = (id_user: string, username: string, id_empresa: string) => {
    const token = Jwt.sign({ id_user, username, id_empresa }, process.env.JWT_SECRET, {
        expiresIn: '8h'
    })
    return token
}