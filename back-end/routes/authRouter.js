import express from "express";
import { AuthController } from "../controllers/AuthController.js";
import { authBruteforceProtection } from "../middleware/rateLimitMiddleware.js";

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
authenticationRouter.post("/signup", authBruteforceProtection, AuthController.signup);

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
authenticationRouter.post("/login", authBruteforceProtection, AuthController.login);