import express from "express";
import { AuthController } from "../controllers/AuthController.js";

export const authenticationRouter = express.Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Registra un nuovo utente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: Luigi
 *               password:
 *                 type: string
 *                 example: segreto123
 *     responses:
 *       201:
 *         description: Utente registrato con successo
 *       409:
 *         description: Username già in uso
 */
// Rotta di Registrazione: POST /api/auth/signup
authenticationRouter.post("/signup", async (req, res, next) => {
    try {
        const user = await AuthController.saveUser(req, res);
        const token = AuthController.issueToken(user);
        res.status(201).json({
            message: "Registrazione completata con successo",
            user,
            token
        });
    } catch (err) {
        next(err);
    }
});
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Effettua il login di un utente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: Luigi
 *               password:
 *                 type: string
 *                 example: segreto123
 *     responses:
 *       200:
 *         description: Login effettuato con successo
 *       401:
 *         description: Credenziali non valide
 */
// Rotta di Login: POST /api/auth/login
authenticationRouter.post("/login", async (req, res, next) => {
    try {
        const user = await AuthController.checkCredentials(req, res);
        if (user) {
            const token = AuthController.issueToken(user);
            res.json({
                user: { id: user.id, username: user.username },
                token
            });
        } else {
            res.status(401).json({ error: "Credenziali non valide. Riprova." });
        }
    } catch (err) {
        next(err);
    }
});