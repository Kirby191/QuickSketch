import express from "express";
import { WordController } from "../controllers/WordController.js";
import { enforceAuthentication, enforceAdmin } from "../middleware/authMiddleware.js";

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
 *       - in: query
 *         name: exclude
 *         schema:
 *           type: string
 *         example: gatto,pizza,castello
 *         description: Lista separata da virgole di parole da escludere dall'estrazione
 *     responses:
 *       200:
 *         description: Array di parole casuali
 *       401:
 *         description: Non autorizzato (token mancante o non valido)
 */
wordRouter.get("/random", enforceAuthentication, WordController.getRandomWords);

/**
 * @swagger
 * /api/words:
 *   post:
 *     summary: Aggiunge una nuova parola al database (Admin)
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
 *       403:
 *          description: Accesso negato (solo per amministratori)
 *       409:
 *         description: Parola già esistente
 */
// POST /api/words
wordRouter.post("/", enforceAuthentication, enforceAdmin, WordController.addWord);

/**
 * @swagger
 * /api/words/{text}:
 *   delete:
 *     summary: Rimuove una parola dal dizionario tramite il suo nome (Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: text
 *         required: true
 *         schema:
 *           type: string
 *         example: clessidra
 *     responses:
 *       200:
 *         description: Parola rimossa con successo
 *       403:
 *         description: Accesso negato (Utente non Admin)
 *       404:
 *         description: Parola non trovata
 */
// Solo un ADMIN può rimuovere una parola dal pool tramite il suo nome
wordRouter.delete("/:text", enforceAuthentication, enforceAdmin, WordController.deleteWord);