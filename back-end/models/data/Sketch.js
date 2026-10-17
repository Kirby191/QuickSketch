import { DataTypes } from "sequelize";

export function createModel(database) {
    // imageData contiene l'immagine della canvas in formato Base64.
    database.define('Sketch', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        word: {
            type: DataTypes.STRING,
            allowNull: false
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'Generale'
        },
        imageData: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        drawingTime: {
            // Durata del disegno espressa in secondi.
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        indexes: [
            { fields: ['authorId'] },
            { fields: ['category'] },
            { fields: ['createdAt'] }
        ]
    });
}