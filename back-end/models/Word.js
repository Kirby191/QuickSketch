import { DataTypes } from "sequelize";

export function createModel(database) {
    database.define('Word', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        text: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'Generale'
        },
        difficulty: {
            // Utile per filtrare o dare più punti in futuro: 'EASY', 'MEDIUM', 'HARD'
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'MEDIUM'
        }
    });
}