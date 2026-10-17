// Errore applicativo con status HTTP propagato dall'error handler globale.
export class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.name = "HttpError";
        this.status = status;
    }
}