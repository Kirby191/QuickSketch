import { Sequelize } from "sequelize";

// Importa le funzioni di creazione dei modelli
import { createModel as createUserModel } from "./data/User.js";
import { createModel as createSketchModel } from "./data/Sketch.js";
import { createModel as createAttemptModel } from "./data/Attempt.js";
import { createModel as createWordModel } from "./data/Word.js";

// Importa la funzione di seeding per popolare il database con dati iniziali
import { seedDatabase } from "../utils/seedDatabase.js";
import 'dotenv/config';

export const database = new Sequelize(process.env.DB_CONNECTION_URI || "sqlite:database.db", 
    { 
        // disabilita il logging delle query SQL per migliorare leggibilità della console
        logging: false
    });

// Inizializza i modelli
createUserModel(database);
createSketchModel(database);
createAttemptModel(database);
createWordModel(database);

// Estrae i modelli definiti dal database
export const { User, Sketch, Attempt, Word } = database.models;

// AUTORE -> SKETCH (Foreign Key: authorId)
User.hasMany(Sketch, { 
    foreignKey: { name: 'authorId', allowNull: false }, 
    as: 'sketches',
    onDelete: 'CASCADE' 
});
Sketch.belongsTo(User, { 
    foreignKey: { name: 'authorId', allowNull: false }, 
    as: 'author' 
});

// GIOCATORE -> ATTEMPT (Foreign Key: playerId)
User.hasMany(Attempt, { 
    foreignKey: { name: 'playerId', allowNull: false }, 
    as: 'attempts',
    onDelete: 'CASCADE' 
});
Attempt.belongsTo(User, { 
    foreignKey: { name: 'playerId', allowNull: false }, 
    as: 'player' 
});

// SKETCH -> ATTEMPT (Foreign Key: sketchId)
Sketch.hasMany(Attempt, { 
    foreignKey: { name: 'sketchId', allowNull: false }, 
    as: 'attempts',
    onDelete: 'CASCADE' 
});
Attempt.belongsTo(Sketch, { 
    foreignKey: { name: 'sketchId', allowNull: false }, 
    as: 'sketch' 
});

// SKETCH -> WORD (Foreign Key: wordId)
Word.hasMany(Sketch, {
     foreignKey: { name: 'wordId', allowNull: true }, 
     as: 'sketches', 
     onDelete: 'SET NULL'
 });
Sketch.belongsTo(Word, { 
    foreignKey: { name: 'wordId', allowNull: true }, 
    as: 'wordRef' });

// 4. Sincronizzazione e popolamento
export async function initDatabase() {
    try {
        await database.sync();
        console.log("Database synchronized.");
        await seedDatabase();
    } catch (err) {
        console.error("Database initialization error:", err);
        throw err;
    }
}