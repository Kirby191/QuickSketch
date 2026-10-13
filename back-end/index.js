import express from 'express';
import cors from 'cors';
import 'dotenv/config'; // Carica in automatico le variabili dal file .env
import './models/Database.js'; // Importa il file per inizializzare il database e i modelli

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione dei Middleware
app.use(cors());
app.use(express.json());

// Endpoint di test
app.get('/api/status', (req, res) => {
    res.json({ message: "Server avviato con successo!" });
});

// Middleware per la gestione degli errori
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ 
        error: err.message || "Si è verificato un errore interno" 
    });
});

app.listen(PORT, () => {
    console.log(`Server avviato con successo sulla porta ${PORT}`);
});