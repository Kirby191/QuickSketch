import { DataTypes } from "sequelize";

export function createModel(database) {
    // Le credenziali sono persistite in forma hashata dal controller di autenticazione.
    database.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            // Lo username è l'identificativo pubblico e deve essere univoco.
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            // Può essere 'USER' oppure 'ADMIN'
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'USER'
        }
    });
}