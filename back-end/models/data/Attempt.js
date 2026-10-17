import { DataTypes } from "sequelize";

export function createModel(database) {
    database.define('Attempt', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        attemptsCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        status: {
            // Può essere: 'IN_PROGRESS', 'WON', 'LOST'
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'IN_PROGRESS'
        },
        guessedWords: {
            // Salviamo la lista dei tentativi fatti in formato stringa JSON
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '[]'
        }
}, {
        // Garantisce al massimo 1 record Attempt per (playerId, sketchId) e indicizza le JOIN per sketchId
        indexes: [
            {
                unique: true,
                fields: ['playerId', 'sketchId']
            },
            {
                fields: ['sketchId']
            },
            {
                fields: ['status']
            }
        ]
    });
}