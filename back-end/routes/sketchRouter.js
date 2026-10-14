import express from "express";
import { SketchController } from "../controllers/SketchController.js";
import { enforceAuthentication, optionalAuthentication } from "../middleware/authMiddleware.js";

export const sketchRouter = express.Router();

/**
 * @swagger
 * /api/sketches:
 *   get:
 *     summary: Esplora la raccolta di tutti gli sketch (pubblica, arricchita se loggati)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtra gli sketch per categoria (es. Animali, Oggetti)
 *       - in: query
 *         name: authorId
 *         schema:
 *           type: integer
 *         description: Filtra gli sketch di uno specifico autore
 *     responses:
 *       200:
 *         description: Lista degli sketch pubblicati
 */
sketchRouter.get("/", optionalAuthentication, SketchController.getAllSketches);

/**
 * @swagger
 * /api/sketches/{id}:
 *   get:
 *     summary: Ottiene i dettagli di un singolo sketch e lo stato dei tentativi dell'utente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dettagli dello sketch
 *       404:
 *         description: Sketch non trovato
 */
sketchRouter.get("/:id", optionalAuthentication, SketchController.getSketchById);

/**
 * @swagger
 * /api/sketches:
 *   post:
 *     summary: Pubblica un nuovo sketch (Solo utenti autenticati)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - word
 *               - imageData
 *             properties:
 *               word:
 *                 type: string
 *                 example: gatto
 *               imageData:
 *                 type: string
 *                 example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *               drawingTime:
 *                 type: integer
 *                 example: 38
 *     responses:
 *       201:
 *         description: Sketch creato con successo
 *       400:
 *         description: Parola non valida o formato immagine errato
 *       401:
 *         description: Non autenticato
 */
sketchRouter.post("/", enforceAuthentication, SketchController.createSketch);

/**
 * @swagger
 * /api/sketches/{id}:
 *   delete:
 *     summary: Elimina uno sketch (Solo autore dello sketch o Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sketch eliminato
 *       403:
 *         description: Non autorizzato (non sei l'autore)
 *       404:
 *         description: Sketch non trovato
 */
sketchRouter.delete("/:id", enforceAuthentication, SketchController.deleteSketch);