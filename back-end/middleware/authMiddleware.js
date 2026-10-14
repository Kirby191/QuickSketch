import { AuthController } from "../controllers/AuthController.js";

// 1. Obbliga l'utente a essere autenticato (per disegnare o indovinare)
export function enforceAuthentication(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1]; // Formato standard: "Bearer <token>"

    if (!token) {
        return next({ status: 401, message: "Accesso negato. Effettua il login." });
    }

    AuthController.isTokenValid(token, (err, decodedToken) => {
        if (err) {
            return next({ status: 401, message: "Token non valido o scaduto." });
        }
        req.userId = decodedToken.userId;
        req.username = decodedToken.username;
        next();
    });
}

// 2. Identifica l'utente se è loggato, ma permette l'accesso anche agli ospiti non registrati
export function optionalAuthentication(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];

    if (!token) {
        return next(); // Procede come utente ospite (non registrato)
    }

    AuthController.isTokenValid(token, (err, decodedToken) => {
        if (!err && decodedToken) {
            req.userId = decodedToken.userId;
            req.username = decodedToken.username;
        }
        next();
    });
}