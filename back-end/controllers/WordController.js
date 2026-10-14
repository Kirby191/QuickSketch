import { Word } from "../models/Database.js";
import { Sequelize } from "sequelize";

const MIN_WORDS = 3;
const MAX_WORDS = 5; // Impedisce a un utente di estrarre l'intero DB

export class WordController {
    
    // Estrae N parole casuali dal database (garantendo sempre tra MIN_WORDS e MAX_WORDS)
    static async getRandomWords(req, res, next) {
        try {
            const parsedCount = Number.parseInt(req.query.count, 10);

            // Se non è un numero valido (NaN) o è minore di 3, usa sempre 3 (MIN_WORDS).
            // Se supera MAX_WORDS, lo limita a MAX_WORDS.
            let count = MIN_WORDS;
            if (!Number.isNaN(parsedCount) && parsedCount >= MIN_WORDS) {
                count = Math.min(parsedCount, MAX_WORDS);
            }

            const randomWords = await Word.findAll({
                order: Sequelize.literal('RANDOM()'),
                limit: count,
                attributes: ['id', 'text', 'category', 'difficulty']
            });

            res.json(randomWords);
        } catch (err) {
            next(err);
        }
    }

    // Permette di aggiungere nuove parole al dizionario (utile per l'amministratore o per il seeding)
    static async addWord(req, res, next) {
        try {
            const { text, category, difficulty } = req.body;

            if (!text) {
                return res.status(400).json({ error: "Il testo della parola è obbligatorio." });
            }

            // Normalizziamo la parola (tutto minuscolo e senza spazi extra)
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
            // Se la parola esiste già, Sequelize solleverà un errore per violazione del vincolo 'unique'
            if (err.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error: "Questa parola è già presente nel dizionario." });
            }
            next(err);
        }
    }

    // Rimuove una parola dal dizionario tramite il suo testo (Solo Admin)
    static async deleteWord(req, res, next) {
        try {
            const rawText = req.params.text;
            if (!rawText) {
                return res.status(400).json({ error: "Specifica la parola da eliminare." });
            }

            const normalizedText = rawText.trim().toLowerCase();
            const wordToDelete = await Word.findOne({ where: { text: normalizedText } });

            if (!wordToDelete) {
                return res.status(404).json({ error: `La parola '${normalizedText}' non esiste nel dizionario.` });
            }

            await wordToDelete.destroy(); // Elimina l'entità dal DB

            res.json({
                message: `Parola '${normalizedText}' rimossa con successo dal pool.`
            });
        } catch (err) {
            next(err);
        }
    }
}