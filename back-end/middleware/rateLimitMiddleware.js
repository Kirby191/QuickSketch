const authAttemptsStore = new Map();

const MAX_ATTEMPTS_BEFORE_LOCK = 5;   // Dopo 5 tentativi falliti/spam scatta la punizione
const BASE_LOCKOUT_MS = 15 * 1000;    // Punizione base: 15 secondi (raddoppia ad ogni abuso)
const WINDOW_RESET_MS = 10 * 60 * 1000; // Reset fisiologico dopo 10 minuti di inattività

function getClientKey(req) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown-ip';
    // Su /signup blocchiamo per IP (evita la creazione massiva di account random).
    if (req.path.includes('signup')) {
        return `${ip}:signup`;
    }
    const rawUser = typeof req.body?.username === 'string'
        ? req.body.username.trim().toLowerCase()
        : 'global';
    return `${ip}:${req.path}:${rawUser}`;
}

export function authBruteforceProtection(req, res, next) {
    const key = getClientKey(req);
    const now = Date.now();

    let record = authAttemptsStore.get(key);
    if (!record || (now - record.lastAttemptAt > WINDOW_RESET_MS && now > record.lockUntil)) {
        record = {
            attempts: 0,
            strikes: 0,
            lockUntil: 0,
            lastAttemptAt: now
        };
    }

    // Se l'utente è attualmente sotto punizione e prova ancora a spammare:
    // incrementiamo la penalità (+5 secondi extra immediati per lo spam durante il blocco!)
    if (record.lockUntil > now) {
        record.lockUntil += 3000; // Penalità aggiuntiva per chi spamma il bottone durante il blocco
        authAttemptsStore.set(key, record);

        const retryAfterSeconds = Math.ceil((record.lockUntil - now) / 1000);
        res.setHeader('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
            code: 429,
            retryAfterSeconds,
            description: `Troppi tentativi ravvicinati! Sistema anti-bruteforce attivo: attendi ${retryAfterSeconds} secondi prima di riprovare.`
        });
    }

    // Esponiamo due helper sulla request per il Controller:
    // 1. Registra un fallimento/tentativo (e applica la punizione esponenziale se supera la soglia)
    req.registerAuthAttempt = (isFailed = true) => {
        if (!isFailed && req.path.includes('login')) {
            // Login riuscito: azzeriamo la fedina penale dell'utente
            authAttemptsStore.delete(key);
            return;
        }

        record.attempts += 1;
        record.lastAttemptAt = Date.now();

        if (record.attempts >= MAX_ATTEMPTS_BEFORE_LOCK) {
            record.strikes += 1;
            // Escalation esponenziale: 15s -> 30s -> 60s -> 120s
            const penaltyMs = BASE_LOCKOUT_MS * Math.pow(2, record.strikes - 1);
            record.lockUntil = Date.now() + penaltyMs;
            record.attempts = 0; // Reset del contatore parziale per il prossimo ciclo
        }

        authAttemptsStore.set(key, record);
    };

    next();
}