import { Sketch, Attempt } from "../models/Database.js";
import { HttpError } from "../utils/HttpError.js";

const MAX_ATTEMPTS = 10;

export class AttemptController {

    /**
     * Calcola la distanza di Levenshtein (numero minimo di modifiche di 1 carattere)
     * tra due stringhe in tempo O(N*M) e spazio O(min(N,M)).
     */
    static levenshteinDistance(a, b) {
        if (a === b) return 0;
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = Array.from({ length: a.length + 1 }, () =>
            new Array(b.length + 1).fill(0)
        );

        for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
        for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,      // Cancellazione
                    matrix[i][j - 1] + 1,      // Inserimento
                    matrix[i - 1][j - 1] + cost // Sostituzione
                );
            }
        }
        return matrix[a.length][b.length];
    }

    /**
     * Determina se il tentativo errato è "molto vicino" alla parola reale
     */
    static isGuessClose(guess, target) {
        if (guess === target) return false;
        const distance = AttemptController.levenshteinDistance(guess, target);
        // Per parole corte (<= 4 lettere) tolleriamo 1 carattere di differenza;
        // per parole da 5+ lettere tolleriamo fino a 2 caratteri di differenza.
        const maxAllowedDistance = target.length <= 4 ? 1 : 2;
        return distance > 0 && distance <= maxAllowedDistance;
    }

    /**
     * POST /api/sketches/:id/attempts
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

            // 4. Verifichiamo che la partita non sia già conclusa
            if (attempt.status === 'WON') {
                throw new HttpError(400, "Hai già indovinato questo sketch!");
            }
            if (attempt.status === 'LOST' || attempt.attemptsCount >= MAX_ATTEMPTS) {
                throw new HttpError(400, "Hai esaurito i 10 tentativi disponibili per questo sketch.");
            }

            // 5. Controlliamo che la parola non sia già stata tentata
            const guessedWordsList = JSON.parse(attempt.guessedWords || '[]');
            if (guessedWordsList.includes(normalizedGuess)) {
                throw new HttpError(400, `Hai già provato la parola '${normalizedGuess}' su questo sketch.`);
            }

            // 6. Valutazione del tentativo e calcolo vicinanza (Levenshtein)
            guessedWordsList.push(normalizedGuess);
            const newAttemptsCount = attempt.attemptsCount + 1;
            const targetWord = sketch.word.toLowerCase();
            const isCorrect = normalizedGuess === targetWord;
            const isCloseGuess = !isCorrect && AttemptController.isGuessClose(normalizedGuess, targetWord);

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

            // 8. Costruiamo il messaggio di feedback (includendo il suggerimento "Ci sei andato vicino!")
            const revealSolution = newStatus === 'WON' || newStatus === 'LOST';
            const remaining = MAX_ATTEMPTS - newAttemptsCount;

            let feedbackMessage = `Parola errata! Ti restano ${remaining} tentativi.`;
            if (newStatus === 'WON') {
                feedbackMessage = `Complimenti! Hai indovinato la parola al tentativo n° ${newAttemptsCount}!`;
            } else if (newStatus === 'LOST') {
                feedbackMessage = `Hai esaurito i 10 tentativi! La parola corretta era '${sketch.word}'.`;
            } else if (isCloseGuess) {
                feedbackMessage = `🔥 Fuochino! Ci sei andato molto vicino con '${normalizedGuess}'! Ti restano ${remaining} tentativi.`;
            }

            res.json({
                message: feedbackMessage,
                isCorrect,
                isCloseGuess,
                status: newStatus,
                attemptsCount: newAttemptsCount,
                remainingAttempts: remaining,
                guessedWords: guessedWordsList,
                solution: revealSolution ? sketch.word : null
            });
        } catch (err) {
            next(err);
        }
    }
}