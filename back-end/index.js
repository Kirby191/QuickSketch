import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import './models/Database.js'; // Avvia la sincronizzazione del DB e il seeding delle parole
import { authenticationRouter } from './routes/authRouter.js';
import { wordRouter } from './routes/wordRouter.js';
import swaggerUI from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import { initDatabase } from './models/Database.js';

const app = express();
const PORT = process.env.PORT || 3000;

const swaggerSpec = swaggerJSDoc({
    definition: {
        openapi: '3.1.0',
        info: {
            title: 'QUICKSKETCH REST API',
            version: '1.0.0',
            description: 'Documentazione e test interattivo per il back-end'
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: ['./routes/*Router.js'] // Legge i commenti @swagger dentro routes/
});

app.use(cors());
app.use(express.json({ limit: '5mb' })); // Limite alzato a 5mb per ospitare comodamente le stringhe Base64

// Montiamo le rotte standard
app.use('/api/auth', authenticationRouter);
app.use('/api/words', wordRouter);

// Endpoint di stato
app.get('/api/status', (req, res) => {
    res.json({ message: "Server funzionante!" });
});

// Pagina grafica su http://localhost:3000/api-docs
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Error handler
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || "Si è verificato un errore interno del server";

    // Se è un errore del server (500), stampiamo lo stack trace completo per il debug
    // Se è un errore della richiesta client (4xx), stampiamo una riga pulita e leggibile.
    if (status >= 500) {
        console.error(`[ERROR ${status}] ${req.method} ${req.originalUrl}:`, err.stack || err);
    } else {
        console.warn(`[WARN ${status}] ${req.method} ${req.originalUrl} -> ${message}`);
    }

    res.status(status).json({
        code: status,
        description: message
    });
});

initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server in ascolto sulla porta ${PORT}`);
    });
});