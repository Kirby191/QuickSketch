import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJSDoc({
    definition: {
        openapi: '3.1.0',
        info: {
            title: 'QUICKSKETCH REST API',
            version: '1.0.1',
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
