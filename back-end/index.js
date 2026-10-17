import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { initDatabase } from './models/Database.js';

// Import dei requisiti per la documentazione OpenAPI / Swagger
import { swaggerSpec } from './utils/swagger.js';
import swaggerUI from 'swagger-ui-express';

// Import dei Router REST
import { authenticationRouter } from './routes/authRouter.js';
import { wordRouter } from './routes/wordRouter.js';
import { sketchRouter } from './routes/sketchRouter.js';
import { statsRouter } from './routes/statsRouter.js';

// Gestori globali per rotte inesistenti ed errori
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';

export const app = express();
const PORT = process.env.PORT || 3000;

// Middleware comuni a tutte le richieste.
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200'
}));
app.use(express.json({ limit: '5mb' }));
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 2. Documentazione OpenAPI / Swagger
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Router REST organizzati per area funzionale.
app.use('/api/auth', authenticationRouter);
app.use('/api/words', wordRouter);
app.use('/api/sketches', sketchRouter);
app.use('/api/stats', statsRouter);

// Questi middleware devono rimanere in coda, dopo tutte le rotte.
app.use(notFoundHandler);
app.use(errorHandler);

// Il server parte solo dopo la sincronizzazione e il seeding del database.
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server avviato su http://localhost:${PORT} (Docs: http://localhost:${PORT}/api-docs)`);
    });
});