import Jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/Database.js";

const SALT_ROUNDS = 10;

export class AuthController {

    // POST /api/auth/signup
    static async signup(req, res, next) {
        try {
            const { username, password } = req.body;
            if (!username || !password || username.trim().length < 3 || password.length < 4) {
                throw new HttpError(400, "Username (min 3 caratteri) e password (min 4 caratteri) sono obbligatori.");
            }

            const normalizedUsername = username.trim();
            const existingUser = await User.findOne({ where: { username: normalizedUsername } });
            if (existingUser) {
                throw new HttpError(409, "Questo username è già in uso.");
            }

            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            const newUser = await User.create({
                username: normalizedUsername,
                password: hashedPassword,
                role: 'USER'
            });

            const userPayload = {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role,
                createdAt: newUser.createdAt
            };
            const token = AuthController.issueToken(newUser);

            res.status(201).json({
                message: "Registrazione completata con successo",
                user: userPayload,
                token
            });
        } catch (err) {
            next(err);
        }
    }

    // POST /api/auth/login
    static async login(req, res, next) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                throw new HttpError(400, "Inserisci username e password.");
            }

            const user = await User.findOne({ where: { username: username.trim() } });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                throw new HttpError(401, "Credenziali non valide. Riprova.");
            }

            const token = AuthController.issueToken(user);
            res.json({
                user: { id: user.id, username: user.username, role: user.role },
                token
            });
        } catch (err) {
            next(err);
        }
    }

    // Generazione del token JWT
    static issueToken(user) {
        return Jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION || `${24 * 60 * 60}s` }
        );
    }

    // Verifica validità del token JWT
    static isTokenValid(token, callback) {
        Jwt.verify(token, process.env.JWT_SECRET, callback);
    }
}