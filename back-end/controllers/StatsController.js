import { User, Sketch, Attempt } from "../models/Database.js";
import { HttpError } from "../utils/HttpError.js";

export class StatsController {

    /**
     * Helper che calcola le statistiche complete per un dato userId
     */
    static async computeStatsForUser(userId) {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'role', 'createdAt']
        });

        if (!user) {
            throw new HttpError(404, "Utente non trovato.");
        }

        // Carichiamo in parallelo i disegni creati e le sfide giocate dall'utente.
        const [userSketches, userAttempts] = await Promise.all([
            // 1. Disegni realizzati dall'utente (escludiamo imageData per leggerezza)
            Sketch.findAll({
                where: { authorId: userId },
                attributes: ['id', 'word', 'category', 'drawingTime', 'createdAt'],
                include: [
                    { model: Attempt, as: 'attempts', attributes: ['status', 'attemptsCount'] }
                ],
                order: [['createdAt', 'DESC']]
            }),
            // 2. Tentativi/Partite giocate dall'utente sugli sketch altrui
            Attempt.findAll({
                where: { playerId: userId },
                include: [
                    {
                        model: Sketch,
                        as: 'sketch',
                        attributes: ['id', 'category', 'word', 'authorId', 'createdAt'],
                        include: [{ model: User, as: 'author', attributes: ['id', 'username'] }]
                    }
                ],
                order: [['updatedAt', 'DESC']]
            })
        ]);

        // --- CALCOLO STATISTICHE GIOCATORE (Indovinare) ---
        const wonAttempts = userAttempts.filter(a => a.status === 'WON');
        const lostAttempts = userAttempts.filter(a => a.status === 'LOST');
        const inProgressAttempts = userAttempts.filter(a => a.status === 'IN_PROGRESS');

        const wordsGuessedCount = wonAttempts.length;
        const wordsNotGuessedCount = lostAttempts.length;
        const gamesInProgressCount = inProgressAttempts.length;

        // Tentativi utilizzati (sia il totale assoluto, sia quelli impiegati per le parole indovinate)
        const totalAttemptsUsed = userAttempts.reduce((sum, a) => sum + a.attemptsCount, 0);
        const attemptsUsedForWins = wonAttempts.reduce((sum, a) => sum + a.attemptsCount, 0);
        const avgAttemptsPerWin = wordsGuessedCount > 0
            ? Number((attemptsUsedForWins / wordsGuessedCount).toFixed(2))
            : 0;

        const finishedGames = wordsGuessedCount + wordsNotGuessedCount;
        const winRatePercentage = finishedGames > 0
            ? Number(((wordsGuessedCount / finishedGames) * 100).toFixed(1))
            : 0;

        // --- CALCOLO STATISTICHE DISEGNATORE (Disegnare) ---
        const sketchesCreatedCount = userSketches.length;
        let totalGuessesOnMySketches = 0;
        let successfulGuessesOnMySketches = 0;
        let sketchesSolvedByAtLeastOne = 0;

        for (const s of userSketches) {
            const sAttempts = s.attempts || [];
            const winsOnThisSketch = sAttempts.filter(a => a.status === 'WON').length;
            totalGuessesOnMySketches += sAttempts.length;
            successfulGuessesOnMySketches += winsOnThisSketch;
            if (winsOnThisSketch > 0) {
                sketchesSolvedByAtLeastOne++;
            }
        }

        const avgDrawingTime = sketchesCreatedCount > 0
            ? Number((userSketches.reduce((sum, s) => sum + (s.drawingTime || 0), 0) / sketchesCreatedCount).toFixed(1))
            : 0;

        const artistSuccessRate = totalGuessesOnMySketches > 0
            ? Number(((successfulGuessesOnMySketches / totalGuessesOnMySketches) * 100).toFixed(1))
            : 0;

        return {
            user: {
                id: user.id,
                username: user.username,
                memberSince: user.createdAt
            },
            playerStats: {
                wordsGuessedCount,          // Parole indovinate
                wordsNotGuessedCount,       // Parole non indovinate (esauriti i 10 tentativi)
                gamesInProgressCount,       // Sfide ancora aperte
                totalAttemptsUsed,          // Totale tentativi effettuati
                attemptsUsedForWins,        // Tentativi impiegati nelle partite vinte
                avgAttemptsPerWin,          // Media tentativi per indovinare una parola
                winRatePercentage           // Percentuale di vittoria sulle partite concluse
            },
            artistStats: {
                sketchesCreatedCount,       // Numero di disegni prodotti
                sketchesSolvedByAtLeastOne, // Disegni indovinati da almeno un utente
                totalPlayersOnMySketches: totalGuessesOnMySketches,
                successfulGuessesOnMySketches,
                artistSuccessRate,          // % di giocatori che hanno indovinato i suoi disegni
                avgDrawingTime              // Tempo medio di disegno in secondi
            },
            // Storico recente delle partite giocate (oscurando la parola se ancora IN_PROGRESS)
            recentGames: userAttempts.slice(0, 10).map(a => ({
                attemptId: a.id,
                sketchId: a.sketch?.id,
                category: a.sketch?.category,
                author: a.sketch?.author?.username,
                status: a.status,
                attemptsCount: a.attemptsCount,
                word: (a.status === 'WON' || a.status === 'LOST') ? a.sketch?.word : null,
                updatedAt: a.updatedAt
            }))
        };
    }

    // 1. GET /api/stats/me - Statistiche personali dell'utente loggato
    static async getMyStats(req, res, next) {
        try {
            const stats = await StatsController.computeStatsForUser(req.userId);
            res.json(stats);
        } catch (err) {
            next(err);
        }
    }

    // 2. GET /api/stats/users/:id - Statistiche di uno specifico utente
    static async getUserStatsById(req, res, next) {
        try {
            const targetUserId = Number.parseInt(req.params.id, 10);
            if (Number.isNaN(targetUserId)) {
                throw new HttpError(400, "ID utente non valido.");
            }
            const stats = await StatsController.computeStatsForUser(targetUserId);
            res.json(stats);
        } catch (err) {
            next(err);
        }
    }

    // 3. GET /api/stats/leaderboards - Classifiche Migliori Giocatori e Migliori Disegnatori
    static async getLeaderboards(req, res, next) {
        try {
            const parsedLimit = Number.parseInt(req.query.limit, 10);
            const limit = (!Number.isNaN(parsedLimit) && parsedLimit >= 1) ? Math.min(parsedLimit, 50) : 10;

            // Carichiamo gli utenti con i soli attributi necessari (senza password e senza imageData)
            const users = await User.findAll({
                attributes: ['id', 'username'],
                include: [
                    {
                        model: Attempt,
                        as: 'attempts',
                        attributes: ['status', 'attemptsCount']
                    },
                    {
                        model: Sketch,
                        as: 'sketches',
                        attributes: ['id', 'drawingTime'],
                        include: [
                            { model: Attempt, as: 'attempts', attributes: ['status', 'attemptsCount'] }
                        ]
                    }
                ]
            });

            const playersList = [];
            const artistsList = [];

            for (const u of users) {
                const attempts = u.attempts || [];
                const sketches = u.sketches || [];

                // --- Metriche Giocatore ---
                const won = attempts.filter(a => a.status === 'WON');
                const lost = attempts.filter(a => a.status === 'LOST');
                const wordsGuessedCount = won.length;
                const wordsNotGuessedCount = lost.length;
                const totalAttemptsUsed = attempts.reduce((sum, a) => sum + a.attemptsCount, 0);
                const attemptsOnWins = won.reduce((sum, a) => sum + a.attemptsCount, 0);
                const avgAttemptsPerWin = wordsGuessedCount > 0
                    ? Number((attemptsOnWins / wordsGuessedCount).toFixed(2))
                    : 0;

                // Includiamo nella classifica giocatori chi ha provato almeno uno sketch (o ha indovinato >= 1)
                if (attempts.length > 0) {
                    playersList.push({
                        userId: u.id,
                        username: u.username,
                        wordsGuessedCount,
                        wordsNotGuessedCount,
                        totalAttemptsUsed,
                        avgAttemptsPerWin
                    });
                }

                // --- Metriche Disegnatore ---
                const sketchesCreatedCount = sketches.length;
                if (sketchesCreatedCount > 0) {
                    let totalAttemptsReceived = 0;
                    let totalWinsReceived = 0;
                    let solvedSketchesCount = 0;

                    for (const s of sketches) {
                        const sAttempts = s.attempts || [];
                        const wins = sAttempts.filter(a => a.status === 'WON').length;
                        totalAttemptsReceived += sAttempts.length;
                        totalWinsReceived += wins;
                        if (wins > 0) solvedSketchesCount++;
                    }

                    // Percentuale di successo dei giocatori sui disegni di questo autore
                    const successRate = totalAttemptsReceived > 0
                        ? Number(((totalWinsReceived / totalAttemptsReceived) * 100).toFixed(1))
                        : 0;

                    artistsList.push({
                        userId: u.id,
                        username: u.username,
                        sketchesCreatedCount,
                        solvedSketchesCount,
                        totalWinsReceived,
                        totalAttemptsReceived,
                        successRate
                    });
                }
            }

            // Ordinamento Classifica 1: MIGLIORI GIOCATORI
            // 1° più parole indovinate -> 2° minor media tentativi per vittoria -> 3° meno sconfitte
            playersList.sort((a, b) => {
                if (b.wordsGuessedCount !== a.wordsGuessedCount) {
                    return b.wordsGuessedCount - a.wordsGuessedCount;
                }
                if (a.avgAttemptsPerWin !== b.avgAttemptsPerWin && a.wordsGuessedCount > 0) {
                    return a.avgAttemptsPerWin - b.avgAttemptsPerWin;
                }
                return a.wordsNotGuessedCount - b.wordsNotGuessedCount;
            });

            // Ordinamento Classifica 2: MIGLIORI DISEGNATORI
            // 1° maggior numero di indovinelli riusciti sui propri disegni (totalWinsReceived)
            // 2° maggior percentuale di successo (successRate)
            // 3° maggior numero di disegni realizzati (sketchesCreatedCount)
            artistsList.sort((a, b) => {
                if (b.totalWinsReceived !== a.totalWinsReceived) {
                    return b.totalWinsReceived - a.totalWinsReceived;
                }
                if (b.successRate !== a.successRate) {
                    return b.successRate - a.successRate;
                }
                return b.sketchesCreatedCount - a.sketchesCreatedCount;
            });

            res.json({
                bestPlayers: playersList.slice(0, limit).map((item, idx) => ({ rank: idx + 1, ...item })),
                bestArtists: artistsList.slice(0, limit).map((item, idx) => ({ rank: idx + 1, ...item }))
            });
        } catch (err) {
            next(err);
        }
    }
}