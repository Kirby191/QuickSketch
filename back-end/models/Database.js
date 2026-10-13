import { Sequelize } from "sequelize";
import { createModel as createUserModel } from "./User.js";
import { createModel as createSketchModel } from "./Sketch.js";
import { createModel as createAttemptModel } from "./Attempt.js";
import 'dotenv/config';

export const database = new Sequelize(process.env.DB_CONNECTION_URI || "sqlite:database.db");

// Inizializza i modelli
createUserModel(database);
createSketchModel(database);
createAttemptModel(database);

// Estrae i modelli definiti dal database
export const { User, Sketch, Attempt } = database.models;

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
     as: 'sketches' });
Sketch.belongsTo(Word, { 
    foreignKey: { name: 'wordId', allowNull: true }, 
    as: 'wordRef' });

// Funzione di Seeding iniziale per non lasciare il gioco senza parole al primo avvio
async function seedInitialWords() {
    const count = await Word.count();
    if (count === 0) {
        const initialWords = [
            { text: "gatto", category: "Animali", difficulty: "EASY" },
            { text: "elefante", category: "Animali", difficulty: "MEDIUM" },
            { text: "farfalla", category: "Animali", difficulty: "EASY" },
            { text: "pinguino", category: "Animali", difficulty: "MEDIUM" },
            { text: "ombrello", category: "Oggetti", difficulty: "EASY" },
            { text: "chitarra", category: "Oggetti", difficulty: "MEDIUM" },
            { text: "lampadina", category: "Oggetti", difficulty: "EASY" },
            { text: "clessidra", category: "Oggetti", difficulty: "MEDIUM" },
            { text: "albero", category: "Natura", difficulty: "EASY" },
            { text: "montagna", category: "Natura", difficulty: "MEDIUM" },
            { text: "fiume", category: "Natura", difficulty: "EASY" },
            { text: "mare", category: "Natura", difficulty: "EASY" },
            { text: "vulcano", category: "Natura", difficulty: "MEDIUM" },
            { text: "arcobaleno", category: "Natura", difficulty: "EASY" },
            { text: "aeroplano", category: "Trasporti", difficulty: "MEDIUM" },
            { text: "elicottero", category: "Trasporti", difficulty: "HARD" },
            { text: "pizza", category: "Cibo", difficulty: "EASY" },
            { text: "gelato", category: "Cibo", difficulty: "EASY" },
            { text: "hamburger", category: "Cibo", difficulty: "EASY" },
            { text: "spaghetti", category: "Cibo", difficulty: "MEDIUM" },
            { text: "torta", category: "Cibo", difficulty: "EASY" },
            { text: "castello", category: "Luoghi", difficulty: "MEDIUM" },
            { text: "piramide", category: "Luoghi", difficulty: "MEDIUM" },
            { text: "robot", category: "Tecnologia", difficulty: "MEDIUM" },
            { text: "computer", category: "Tecnologia", difficulty: "EASY" },
        ];
        for (const w of initialWords) {
            await Word.create(w);
        }
        console.log(`Popolate ${initialWords.length} parole iniziali nel database.`);
    }
}

// 4. Sincronizzazione e popolamento
database.sync({ alter: true }).then(async () => {
    console.log("Database synchronized.");
    await seedInitialWords();
}).catch(err => {
    console.error("Synchronization error:", err.message);
});