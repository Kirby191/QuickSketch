import { HttpError } from "../utils/HttpError.js";

// 1. Middleware Catch-All per rotte non trovate (404)
export function notFoundHandler(req, res, next) {
    next(new HttpError(404, `Risorsa non trovata: ${req.method} ${req.originalUrl}`));
}

// 2. Middleware globale di gestione errori (4 parametri obbligatori per Express)
export function errorHandler(err, req, res, next) {
    let status = err.status || 500;
    let message = err.message || "Si è verificato un errore interno del server.";

    // Intercetta JSON malformati inviati nel body della richiesta
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        status = 400;
        message = "Il corpo della richiesta non contiene un JSON valido.";
    }

    // Intercetta automaticamente errori di unicità o validazione di Sequelize
    if (err.name === "SequelizeUniqueConstraintError") {
        status = 409;
        message = "Valore duplicato: l'elemento esiste già nel database.";
    } else if (err.name === "SequelizeValidationError") {
        status = 400;
        message = err.errors?.map(e => e.message).join(", ") || "Dati non validi.";
    }

    if (status >= 500) {
        console.error(`[ERROR ${status}] ${req.method} ${req.originalUrl}:`, err.stack || err);
    } else {
        console.warn(`[WARN ${status}] ${req.method} ${req.originalUrl} -> ${message}`);
    }

    res.status(status).json({
        code: status,
        description: message
    });
}