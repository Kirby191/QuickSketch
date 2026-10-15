import express from "express";
import { StatsController } from "../controllers/StatsController.js";
import { enforceAuthentication } from "../middleware/authMiddleware.js";

export const statsRouter = express.Router();

/**
 * @swagger
 * /api/stats/leaderboards:
 *   get:
 *     summary: Restituisce le due classifiche (Migliori Giocatori e Migliori Disegnatori)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Numero massimo di posizioni per classifica
 *     responses:
 *       200:
 *         description: Oggetto contenente gli array bestPlayers e bestArtists
 */
statsRouter.get("/leaderboards", StatsController.getLeaderboards);

/**
 * @swagger
 * /api/stats/me:
 *   get:
 *     summary: Restituisce le statistiche personali complete dell'utente autenticato
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiche personali da giocatore e da disegnatore
 *       401:
 *         description: Non autenticato
 */
statsRouter.get("/me", enforceAuthentication, StatsController.getMyStats);

/**
 * @swagger
 * /api/stats/users/{id}:
 *   get:
 *     summary: Restituisce le statistiche pubbliche di un utente specifico tramite ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Statistiche dell'utente richiesto
 *       404:
 *         description: Utente non trovato
 */
statsRouter.get("/users/:id", StatsController.getUserStatsById);