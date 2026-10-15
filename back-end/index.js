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

// Error Handler globali
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';

export const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middleware globali
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 2. Documentazione OpenAPI / Swagger
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// 3. Mounting dei Router REST
app.use('/api/auth', authenticationRouter);
app.use('/api/words', wordRouter);
app.use('/api/sketches', sketchRouter);
app.use('/api/stats', statsRouter);

// 4. Gestione rotte inesistenti (404) ed Error Handler globale
app.use(notFoundHandler);
app.use(errorHandler);

// 5. Inizializzazione DB e avvio del server
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server avviato su http://localhost:${PORT} (Docs: http://localhost:${PORT}/api-docs)`);
    });
});