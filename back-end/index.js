import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import './models/Database.js'; // Avvia la sincronizzazione del DB e il seeding delle parole
import { authenticationRouter } from './routes/authRouter.js';
import { wordRouter } from './routes/wordRouter.js';
import swaggerUI from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

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
    console.error(err.stack);
    res.status(err.status || 500).json({
        code: err.status || 500,
        description: err.message || "Si è verificato un errore interno"
    });
});

app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});