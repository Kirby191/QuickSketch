import bcrypt from "bcrypt";
import { User, Word } from "../models/Database.js";

// Funzione di Seeding iniziale per non lasciare il gioco senza parole al primo avvio
export async function seedDatabase() {
    const adminExists = await User.findOne({ where: { role: 'ADMIN' } });
    if (!adminExists) {
        const defaultAdminPassword = process.env.ADMIN_PASSWORD || "admin123";
        const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
        await User.create({
            username: process.env.ADMIN_USERNAME || "admin",
            password: hashedPassword,
            role: "ADMIN"
        });
        console.log("Account amministratore di default creato (username: admin).");
    }

    const wordCount = await Word.count();
    if (wordCount === 0) {
        const initialWords = [
            { text: "gatto", category: "Animali", difficulty: "EASY" },
            { text: "elefante", category: "Animali", difficulty: "MEDIUM" },
            { text: "farfalla", category: "Animali", difficulty: "EASY" },
            { text: "pinguino", category: "Animali", difficulty: "MEDIUM" },
            { text: "ombrello", category: "Oggetti", difficulty: "EASY" },
            { text: "chitarra", category: "Oggetti", difficulty: "MEDIUM" },
            { text: "lampadina", category: "Oggetti", difficulty: "EASY" },
            { text: "clessidra", category: "Oggetti", difficulty: "HARD" },
            { text: "pizza", category: "Cibo", difficulty: "EASY" },
            { text: "gelato", category: "Cibo", difficulty: "EASY" },
            { text: "vulcano", category: "Natura", difficulty: "MEDIUM" },
            { text: "arcobaleno", category: "Natura", difficulty: "EASY" },
            { text: "castello", category: "Luoghi", difficulty: "MEDIUM" },
            { text: "piramide", category: "Luoghi", difficulty: "MEDIUM" },
            { text: "aeroplano", category: "Trasporti", difficulty: "MEDIUM" },
            { text: "elicottero", category: "Trasporti", difficulty: "HARD" }
        ];
        await Word.bulkCreate(initialWords, { ignoreDuplicates: true });
        console.log(`Popolate ${initialWords.length} parole iniziali nel database.`);
    }
}