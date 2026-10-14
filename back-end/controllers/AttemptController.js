import { Sketch, Attempt } from "../models/Database.js";
import { HttpError } from "../utils/HttpError.js";

const MAX_ATTEMPTS = 10;

export class AttemptController {

    /**
     * POST /api/sketches/:id/attempts
     * Invia un tentativo testuale per indovinare la parola dello sketch :id
     */
    static async submitGuess(req, res, next) {
        try {
            const sketchId = Number.parseInt(req.params.id, 10);
            if (Number.isNaN(sketchId)) {
                throw new HttpError(400, "ID dello sketch non valido.");
            }

            const { guess } = req.body;
            if (!guess || typeof guess !== "string" || guess.trim().length === 0) {
                throw new HttpError(400, "Devi inserire una parola valida per effettuare un tentativo.");
            }

            const normalizedGuess = guess.trim().toLowerCase();

            // 1. Recuperiamo lo sketch dal DB
            const sketch = await Sketch.findByPk(sketchId);
            if (!sketch) {
                throw new HttpError(404, "Sketch non trovato.");
            }

            // 2. Regola di business: l'autore non può indovinare il proprio disegno
            if (sketch.authorId === req.userId) {
                throw new HttpError(403, "Non puoi provare a indovinare uno sketch creato da te.");
            }

            // 3. Cerchiamo o inizializziamo il record della sfida per (playerId, sketchId)
            let [attempt] = await Attempt.findOrCreate({
                where: {
                    playerId: req.userId,
                    sketchId: sketch.id
                },
                defaults: {
                    attemptsCount: 0,
                    status: 'IN_PROGRESS',
                    guessedWords: '[]'
                }
            });

            // 4. Verifichiamo che la partita su questo sketch non sia già conclusa
            if (attempt.status === 'WON') {
                throw new HttpError(400, "Hai già indovinato questo sketch!");
            }
            if (attempt.status === 'LOST' || attempt.attemptsCount >= MAX_ATTEMPTS) {
                throw new HttpError(400, "Hai esaurito i 10 tentativi disponibili per questo sketch.");
            }

            // 5. Controlliamo che la parola non sia già stata tentata in precedenza
            const guessedWordsList = JSON.parse(attempt.guessedWords || '[]');
            if (guessedWordsList.includes(normalizedGuess)) {
                throw new HttpError(400, `Hai già provato la parola '${normalizedGuess}' su questo sketch.`);
            }

            // 6. Aggiorniamo il conteggio e lo storico delle parole provate
            guessedWordsList.push(normalizedGuess);
            const newAttemptsCount = attempt.attemptsCount + 1;
            const isCorrect = normalizedGuess === sketch.word.toLowerCase();

            let newStatus = 'IN_PROGRESS';
            if (isCorrect) {
                newStatus = 'WON';
            } else if (newAttemptsCount >= MAX_ATTEMPTS) {
                newStatus = 'LOST';
            }

            // 7. Salviamo il nuovo stato nel database
            attempt.attemptsCount = newAttemptsCount;
            attempt.status = newStatus;
            attempt.guessedWords = JSON.stringify(guessedWordsList);
            await attempt.save();

            // 8. Costruiamo la risposta (sveliamo la soluzione solo se WON o LOST!)
            const revealSolution = newStatus === 'WON' || newStatus === 'LOST';

            let feedbackMessage = `Parola errata! Ti restano ${MAX_ATTEMPTS - newAttemptsCount} tentativi.`;
            if (newStatus === 'WON') {
                feedbackMessage = `Complimenti! Hai indovinato la parola al tentativo n° ${newAttemptsCount}!`;
            } else if (newStatus === 'LOST') {
                feedbackMessage = `Hai esaurito i 10 tentativi! La parola corretta era '${sketch.word}'.`;
            }

            res.json({
                message: feedbackMessage,
                isCorrect,
                status: newStatus,
                attemptsCount: newAttemptsCount,
                remainingAttempts: MAX_ATTEMPTS - newAttemptsCount,
                guessedWords: guessedWordsList,
                // La parola corretta viene restituita SOLO a vittoria o sconfitta definitiva
                solution: revealSolution ? sketch.word : null
            });
        } catch (err) {
            next(err);
        }
    }
}