import { AuthController } from "../controllers/AuthController.js";
import { HttpError } from "../utils/HttpError.js";

// 1. Obbliga l'utente a essere autenticato (per disegnare o indovinare)
export function enforceAuthentication(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1]; // Formato standard: "Bearer <token>"

    if (!token) {
        return next(new HttpError(401, "Accesso negato: Effettua il login."));
    }

    AuthController.isTokenValid(token, (err, decodedToken) => {
        if (err) {
            return next(new HttpError(401, "Token non valido o scaduto."));
        }
        req.userId = decodedToken.userId;
        req.username = decodedToken.username;
        req.userRole = decodedToken.role;
        next();
    });
}

// 2. Consente l'accesso solo agli ADMIN
export function enforceAdmin(req, res, next) {
    if (req.userRole === 'ADMIN') {
        next();
    } else {
        return next(new HttpError(403, "Operazione non consentita: sono richiesti i privilegi di amministratore."));
    }
}

// 3. Identifica l'utente se è loggato, ma permette l'accesso anche agli ospiti non registrati
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
            req.userRole = decodedToken.role;
        }
        next();
    });
}