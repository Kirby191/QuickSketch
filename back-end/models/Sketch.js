import { DataTypes } from "sequelize";

export function createModel(database) {
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
            type: DataTypes.TEXT, // TEXT è fondamentale per contenere l'intera stringa Base64 della canvas!
            allowNull: false
        },
        drawingTime: {
            type: DataTypes.INTEGER, // Tempo impiegato in secondi
            allowNull: true
        }
    });
}