import { DataTypes } from "sequelize";

export function createModel(database) {
    // Il dizionario alimenta sia il gioco sia la validazione degli sketch pubblicati.
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
            // La categoria permette di filtrare la galleria e organizzare il dizionario.
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