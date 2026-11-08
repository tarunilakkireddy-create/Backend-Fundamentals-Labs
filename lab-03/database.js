
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "books.db");

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
    } else {
        console.log("Connected to SQLite database!");
    }
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            price REAL NOT NULL
        )
    `, (err) => {
        if (err) {
            console.error("Table creation failed:", err.message);
        } else {
            console.log("Books table created successfully!");
        }
    });

    db.get("SELECT COUNT(*) AS count FROM books", (err, row) => {
        if (err) {
            console.error("Error checking books:", err.message);
            return;
        }

        if (row.count === 0) {
            const books = [
                ["The Alchemist", "Paulo Coelho", 250],
                ["Wings of Fire", "A.P.J. Abdul Kalam", 300],
                ["Harry Potter", "J.K. Rowling", 450],
                ["Atomic Habits", "James Clear", 350],
                ["Rich Dad Poor Dad", "Robert Kiyosaki", 280],
                ["The Hobbit", "J.R.R. Tolkien", 400],
                ["Think Like a Monk", "Jay Shetty", 320],
                ["Ikigai", "Hector Garcia", 200]
            ];

            const statement = db.prepare(
                "INSERT INTO books (title, author, price) VALUES (?, ?, ?)"
            );

            books.forEach((book) => statement.run(book));

            statement.finalize((err) => {
                if (err) {
                    console.error("Insertion failed:", err.message);
                } else {
                    console.log("Sample books inserted successfully!");
                }
            });
        }
    });
});

module.exports = db;
