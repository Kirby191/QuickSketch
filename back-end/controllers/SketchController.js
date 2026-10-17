import { Sketch, User, Word, Attempt } from "../models/Database.js";
import { HttpError } from "../utils/HttpError.js";
import { AttemptController } from "./AttemptController.js";

const MAX_DRAWING_TIME_SECONDS = 60;
const MAX_ATTEMPTS = 10;

export class SketchController {

    /**
     * Metodo helper che sanitizza lo Sketch prima di inviarlo al client.
     * Nasconde la parola segreta se l'utente non è l'autore e non ha ancora concluso la partita (WON o LOST).
     */
    static formatSketchForUser(sketchInstance, currentUserId = null) {
        const sketch = sketchInstance.toJSON ? sketchInstance.toJSON() : sketchInstance;
        const attempts = sketch.attempts || [];

        // Statistiche pubbliche dello sketch (utili per le card in galleria)
        const totalPlayers = attempts.length;
        const solvedCount = attempts.filter(a => a.status === 'WON').length;

        // Verifichiamo se l'utente corrente è l'autore o ha una partita associata
        const isAuthor = currentUserId !== null && sketch.authorId === currentUserId;
        const userAttempt = currentUserId !== null
            ? attempts.find(a => a.playerId === currentUserId)
            : null;

        // La soluzione viene svelata SOLO all'autore o a chi ha già vinto/perso (esauriti i 10 tentativi)
        const canSeeWord = isAuthor || (userAttempt && (userAttempt.status === 'WON' || userAttempt.status === 'LOST'));
        const guessedWords = (userAttempt && userAttempt.guessedWords)
            ? JSON.parse(userAttempt.guessedWords)
            : [];
        const closeWords = guessedWords.filter(word =>
            AttemptController.isGuessClose(word.toLowerCase(), sketch.word.toLowerCase())
        );

        return {
            id: sketch.id,
            category: sketch.category,
            imageData: sketch.imageData,
            drawingTime: sketch.drawingTime,
            createdAt: sketch.createdAt,
            author: sketch.author, // { id, username }
            wordLength: sketch.word.length,
            word: canSeeWord ? sketch.word : null, // Anti-cheat: oscurata se la partita è aperta!
            stats: {
                totalPlayers,
                solvedCount
            },
            // Contesto per l'utente loggato (null se ospite non registrato)
            userContext: currentUserId ? {
                isAuthor,
                canPlay: !isAuthor && (!userAttempt || userAttempt.status === 'IN_PROGRESS'),
                status: isAuthor ? 'AUTHOR' : (userAttempt ? userAttempt.status : 'NOT_STARTED'),
                attemptsCount: userAttempt ? userAttempt.attemptsCount : 0,
                remainingAttempts: userAttempt ? (MAX_ATTEMPTS - userAttempt.attemptsCount) : MAX_ATTEMPTS,
                guessedWords,
                closeWords
            } : null
        };
    }

    // 1. POST /api/sketches - Crea un nuovo sketch (Solo utenti autenticati)
    static async createSketch(req, res, next) {
        try {
            const { word, imageData, drawingTime } = req.body;

            if (!word || !imageData) {
                throw new HttpError(400, "La parola scelta e il disegno (imageData) sono obbligatori.");
            }

            // Validazione formato immagine Base64 proveniente dalla Canvas
            if (typeof imageData !== "string" || !imageData.startsWith("data:image/")) {
                throw new HttpError(400, "Formato del disegno non valido. È richiesto un Data URL Base64.");
            }

            // Validazione che la parola appartenga effettivamente al pool predefinito nel DB
            const normalizedWord = word.trim().toLowerCase();
            const validWordRecord = await Word.findOne({ where: { text: normalizedWord } });

            if (!validWordRecord) {
                throw new HttpError(400, `La parola '${normalizedWord}' non appartiene all'insieme di parole consentite.`);
            }

            // Validazione e sanitizzazione del tempo di disegno (tra 1 e 60 secondi)
            let sanitizedTime = Number.parseInt(drawingTime, 10);
            if (Number.isNaN(sanitizedTime) || sanitizedTime < 1) {
                sanitizedTime = MAX_DRAWING_TIME_SECONDS;
            } else if (sanitizedTime > MAX_DRAWING_TIME_SECONDS) {
                sanitizedTime = MAX_DRAWING_TIME_SECONDS;
            }

            const newSketch = await Sketch.create({
                word: validWordRecord.text,
                category: validWordRecord.category, // Prendiamo la categoria certificata dal DB
                wordId: validWordRecord.id,
                imageData,
                drawingTime: sanitizedTime,
                authorId: req.userId
            });

            // Ricarichiamo lo sketch includendo i dati dell'autore per restituire un oggetto completo
            const createdSketch = await Sketch.findByPk(newSketch.id, {
                include: [
                    { model: User, as: 'author', attributes: ['id', 'username'] },
                    { model: Attempt, as: 'attempts' }
                ]
            });

            res.status(201).json(SketchController.formatSketchForUser(createdSketch, req.userId));
        } catch (err) {
            next(err);
        }
    }

    // 2. GET /api/sketches - Esplora la raccolta degli sketch (Accessibile a tutti, anche ospiti)
    static async getAllSketches(req, res, next) {
        try {
            const { category, authorId } = req.query;
            const whereClause = {};

            // Filtri opzionali tramite query string (es. /api/sketches?category=Animali)
            if (category) {
                whereClause.category = category.trim();
            }
            if (authorId && !Number.isNaN(Number.parseInt(authorId, 10))) {
                whereClause.authorId = Number.parseInt(authorId, 10);
            }

            const sketches = await Sketch.findAll({
                where: whereClause,
                include: [
                    { model: User, as: 'author', attributes: ['id', 'username'] },
                    { model: Attempt, as: 'attempts', attributes: ['playerId', 'status', 'attemptsCount'] }
                ],
                order: [['createdAt', 'DESC']] // Dal più recente al meno recente
            });

            const formattedSketches = sketches.map(sketch =>
                SketchController.formatSketchForUser(sketch, req.userId || null)
            );

            res.json(formattedSketches);
        } catch (err) {
            next(err);
        }
    }

    // 3. GET /api/sketches/:id - Recupera un singolo sketch per la vista di dettaglio/gioco
    static async getSketchById(req, res, next) {
        try {
            const sketchId = Number.parseInt(req.params.id, 10);
            if (Number.isNaN(sketchId)) {
                throw new HttpError(400, "ID dello sketch non valido.");
            }

            const sketch = await Sketch.findByPk(sketchId, {
                include: [
                    { model: User, as: 'author', attributes: ['id', 'username'] },
                    { model: Attempt, as: 'attempts', attributes: ['playerId', 'status', 'attemptsCount', 'guessedWords'] }
                ]
            });

            if (!sketch) {
                throw new HttpError(404, "Sketch non trovato.");
            }

            res.json(SketchController.formatSketchForUser(sketch, req.userId || null));
        } catch (err) {
            next(err);
        }
    }

    // 4. DELETE /api/sketches/:id - Elimina uno sketch (Solo l'autore stesso oppure un ADMIN)
    static async deleteSketch(req, res, next) {
        try {
            const sketchId = Number.parseInt(req.params.id, 10);
            if (Number.isNaN(sketchId)) {
                throw new HttpError(400, "ID dello sketch non valido.");
            }

            const sketch = await Sketch.findByPk(sketchId);
            if (!sketch) {
                throw new HttpError(404, "Sketch non trovato.");
            }

            // Controllo di Autorizzazione: solo il proprietario o un ADMIN può cancellarlo
            if (sketch.authorId !== req.userId && req.userRole !== 'ADMIN') {
                throw new HttpError(403, "Non hai i permessi per eliminare uno sketch creato da un altro utente.");
            }

            await sketch.destroy();
            res.json({ message: "Sketch eliminato con successo." });
        } catch (err) {
            next(err);
        }
    }
}