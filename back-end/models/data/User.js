import { DataTypes } from "sequelize";

export function createModel(database) {
    database.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
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