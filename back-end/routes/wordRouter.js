import express from "express";
import { WordController } from "../controllers/WordController.js";
import { enforceAuthentication } from "../middleware/authMiddleware.js";

export const wordRouter = express.Router();

/**
 * @swagger
 * /api/words/random:
 *   get:
 *     summary: Restituisce un numero specificato di parole casuali
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Numero di parole da estrarre
 *     responses:
 *       200:
 *         description: Array di parole casuali
 *       401:
 *         description: Non autorizzato (token mancante o non valido)
 */
// GET /api/words/random
wordRouter.get("/random", enforceAuthentication, WordController.getRandomWords);

/**
 * @swagger
 * /api/words:
 *   post:
 *     summary: Aggiunge una nuova parola al database
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: pianoforte
 *               category:
 *                 type: string
 *                 example: Oggetti
 *               difficulty:
 *                 type: string
 *                 example: HARD
 *     responses:
 *       201:
 *         description: Parola aggiunta con successo
 *       409:
 *         description: Parola già esistente
 */
// POST /api/words
wordRouter.post("/", enforceAuthentication, WordController.addWord);