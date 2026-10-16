import Jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/Database.js";
import { HttpError } from "../utils/HttpError.js";

const SALT_ROUNDS = 10;

// Regole di complessità password
const MIN_PASSWORD_LENGTH = 6;
const UPPERCASE_REGEX = /[A-Z]/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~;']/;

export class AuthController {

    static validatePasswordStrength(password) {
        if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
            return "La password deve contenere almeno 6 caratteri.";
        }
        if (!UPPERCASE_REGEX.test(password)) {
            return "La password deve contenere almeno una lettera maiuscola.";
        }
        if (!SPECIAL_CHAR_REGEX.test(password)) {
            return "La password deve contenere almeno un carattere speciale (es. !@#$%&*).";
        }
        return null;
    }

    // POST /api/auth/signup
    static async signup(req, res, next) {
        try {
            const { username, password } = req.body;
            if (!username || typeof username !== 'string' || username.trim().length < 3) {
                req.registerAuthAttempt?.(true);
                throw new HttpError(400, "Lo username deve contenere almeno 3 caratteri.");
            }

            // Validazione server-side della complessità della password
            const pwdError = AuthController.validatePasswordStrength(password);
            if (pwdError) {
                req.registerAuthAttempt?.(true);
                throw new HttpError(400, pwdError);
            }

            const normalizedUsername = username.trim();
            const existingUser = await User.findOne({ where: { username: normalizedUsername } });
            if (existingUser) {
                req.registerAuthAttempt?.(true);
                throw new HttpError(409, "Questo username è già in uso.");
            }

            // Anche le registrazioni valide vengono contate contro lo spam massivo di bot
            req.registerAuthAttempt?.(true);

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
                req.registerAuthAttempt?.(true);
                throw new HttpError(400, "Inserisci username e password.");
            }

            const user = await User.findOne({ where: { username: username.trim() } });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                // Tentativo di login fallito: incrementa il contatore anti-bruteforce!
                req.registerAuthAttempt?.(true);
                throw new HttpError(401, "Credenziali non valide. Riprova.");
            }

            // Login riuscito: azzera il contatore dei tentativi falliti
            req.registerAuthAttempt?.(false);

            const token = AuthController.issueToken(user);
            res.json({
                user: { id: user.id, username: user.username, role: user.role },
                token
            });
        } catch (err) {
            next(err);
        }
    }

    static issueToken(user) {
        return Jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION || `${24 * 60 * 60}s` }
        );
    }

    static isTokenValid(token, callback) {
        Jwt.verify(token, process.env.JWT_SECRET, callback);
    }
}