import Jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/Database.js";

const SALT_ROUNDS = 10;

export class AuthController {

    // Registrazione di un nuovo utente
    static async saveUser(req, res) {
        const { username, password } = req.body;

        if (!username || !password || username.trim().length < 3 || password.length < 4) {
            const error = new Error("Username (min 3 caratteri) e password (min 4 caratteri) sono obbligatori.");
            error.status = 400;
            throw error;
        }

        const normalizedUsername = username.trim();

        // Verifica se l'username esiste già
        const existingUser = await User.findOne({ where: { username: normalizedUsername } });
        if (existingUser) {
            const error = new Error("Questo username è già in uso.");
            error.status = 409;
            throw error;
        }

        // Genera il salt e calcola l'hash della password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Salva l'utente nel database
        const newUser = await User.create({
            username: normalizedUsername,
            password: hashedPassword,
            role: 'USER' // Forzato lato server per impedire Privilege Escalation
        });

        return {
            id: newUser.id,
            username: newUser.username,
            role: newUser.role,
            createdAt: newUser.createdAt
        };
    }

    // Controllo credenziali per il Login con bcrypt.compare
    static async checkCredentials(req, res) {
        const { username, password } = req.body;
        if (!username || !password) return null;

        // 1. Cerchiamo l'utente solo per username
        const user = await User.findOne({
            where: { username: username.trim() }
        });

        if (!user) return null;

        // 2. Confrontiamo la password inviata con l'hash bcrypt salvato nel DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return null;

        return user;
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