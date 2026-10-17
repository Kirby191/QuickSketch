import { Word } from "../models/Database.js";
import { Sequelize, Op } from "sequelize";
import { HttpError } from "../utils/HttpError.js";

const MIN_WORDS = 3;
const MAX_WORDS = 5; // Impedisce a un utente di estrarre l'intero DB

export class WordController {
    
    // Estrae N parole casuali dal database escludendo opzionalmente quelle appena mostrate (?exclude=a,b,c)
    static async getRandomWords(req, res, next) {
        try {
            const parsedCount = Number.parseInt(req.query.count, 10);

            let count = MIN_WORDS;
            if (!Number.isNaN(parsedCount) && parsedCount >= MIN_WORDS) {
                count = Math.min(parsedCount, MAX_WORDS);
            }

            // Parsing sicuro delle parole da escludere (es. ?exclude=gatto,pizza,castello)
            const rawExclude = typeof req.query.exclude === 'string' ? req.query.exclude : '';
            const excludedList = rawExclude
                .split(',')
                .map(w => w.trim().toLowerCase())
                .filter(w => w.length > 0);

            const whereClause = excludedList.length > 0
                ? { text: { [Op.notIn]: excludedList } }
                : {};

            let randomWords = await Word.findAll({
                where: whereClause,
                order: Sequelize.literal('RANDOM()'),
                limit: count,
                attributes: ['id', 'text', 'category', 'difficulty']
            });

            // Fallback anti-stallo: se il DB ha poche parole e dopo l'esclusione ne restano meno di 'count',
            // completiamo la terna pescando tra le parole restanti così da restituire sempre 'count' parole.
            if (randomWords.length < count && excludedList.length > 0) {
                const alreadyPickedIds = randomWords.map(w => w.id);
                const missingCount = count - randomWords.length;

                const fallbackWords = await Word.findAll({
                    where: alreadyPickedIds.length > 0
                        ? { id: { [Op.notIn]: alreadyPickedIds } }
                        : {},
                    order: Sequelize.literal('RANDOM()'),
                    limit: missingCount,
                    attributes: ['id', 'text', 'category', 'difficulty']
                });

                randomWords = [...randomWords, ...fallbackWords];
            }

            res.json(randomWords);
        } catch (err) {
            next(err);
        }
    }

    // Permette di aggiungere nuove parole al dizionario (Solo Admin)
    static async addWord(req, res, next) {
        try {
            const { text, category, difficulty } = req.body;

            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                throw new HttpError(400, "Il testo della parola è obbligatorio.");
            }

            const normalizedText = text.trim().toLowerCase();

            const newWord = await Word.create({
                text: normalizedText,
                category: category || "Generale",
                difficulty: difficulty || "MEDIUM"
            });

            res.status(201).json({ 
                message: "Parola aggiunta con successo", 
                word: newWord 
            });
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                return next(new HttpError(409, "Questa parola è già presente nel dizionario."));
            }
            next(err);
        }
    }

    // Rimuove una parola dal dizionario tramite il suo testo (Solo Admin)
    static async deleteWord(req, res, next) {
        try {
            const rawText = req.params.text;
            if (!rawText || rawText.trim().length === 0) {
                throw new HttpError(400, "Specifica la parola da eliminare.");
            }

            const normalizedText = rawText.trim().toLowerCase();
            const wordToDelete = await Word.findOne({ where: { text: normalizedText } });

            if (!wordToDelete) {
                throw new HttpError(404, `La parola '${normalizedText}' non esiste nel dizionario.`);
            }

            await wordToDelete.destroy();

            res.json({
                message: `Parola '${normalizedText}' rimossa con successo dal pool.`
            });
        } catch (err) {
            next(err);
        }
    }
}