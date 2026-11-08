
const express = require("express");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Helper function to get multiple records
function getAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Helper function to get one record
function getOne(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Helper function to insert, update or delete
function execute(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({
                lastID: this.lastID,
                changes: this.changes
            });
        });
    });
}

// GET all books with search, sorting and filtering
app.get("/books", async (req, res) => {
    try {
        const {
            search_q = "",
            order_by = "id",
            order = "ASC",
            limit = "10",
            offset = "0",
            min_price,
            max_price
        } = req.query;

        const allowedColumns = ["id", "title", "author", "price"];

        if (!allowedColumns.includes(order_by)) {
            return res.status(400).json({
                message: "Invalid order_by column"
            });
        }

        if (!["ASC", "DESC"].includes(order.toUpperCase())) {
            return res.status(400).json({
                message: "Order must be ASC or DESC"
            });
        }

        const pageLimit = Number(limit);
        const pageOffset = Number(offset);

        if (!Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 100 ||
            !Number.isInteger(pageOffset) || pageOffset < 0) {
            return res.status(400).json({
                message: "Invalid limit or offset"
            });
        }

        const conditions = [];
        const params = [];

        if (search_q) {
            conditions.push("title LIKE ?");
            params.push(`%${search_q}%`);
        }

        if (min_price !== undefined) {
            const min = Number(min_price);
            if (!Number.isFinite(min)) {
                return res.status(400).json({
                    message: "min_price must be a number"
                });
            }
            conditions.push("price >= ?");
            params.push(min);
        }

        if (max_price !== undefined) {
            const max = Number(max_price);
            if (!Number.isFinite(max)) {
                return res.status(400).json({
                    message: "max_price must be a number"
                });
            }
            conditions.push("price <= ?");
            params.push(max);
        }

        if (min_price !== undefined && max_price !== undefined &&
            Number(min_price) > Number(max_price)) {
            return res.status(400).json({
                message: "min_price cannot be greater than max_price"
            });
        }

        const where = conditions.length
            ? "WHERE " + conditions.join(" AND ")
            : "";

        const sql = `
            SELECT * FROM books
            ${where}
            ORDER BY ${order_by} ${order.toUpperCase()}
            LIMIT ? OFFSET ?
        `;

        params.push(pageLimit, pageOffset);

        const books = await getAll(sql, params);

        res.status(200).json({
            message: "Books retrieved successfully",
            count: books.length,
            data: books
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve books",
            error: error.message
        });
    }
});

// GET a book by ID
app.get("/books/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                message: "Invalid book ID"
            });
        }

        const book = await getOne(
            "SELECT * FROM books WHERE id = ?",
            [id]
        );

        if (!book) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        res.status(200).json({
            message: "Book retrieved successfully",
            data: book
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve book",
            error: error.message
        });
    }
});

// POST a new book
app.post("/books", async (req, res) => {
    try {
        const { title, author, price } = req.body;

        if (typeof title !== "string" || !title.trim() ||
            typeof author !== "string" || !author.trim() ||
            typeof price !== "number" || !Number.isFinite(price) || price < 0) {
            return res.status(400).json({
                message: "Title, author and a valid non-negative numeric price are required"
            });
        }

        const result = await execute(
            "INSERT INTO books (title, author, price) VALUES (?, ?, ?)",
            [title.trim(), author.trim(), price]
        );

        res.status(201).json({
            message: "Book created successfully",
            id: result.lastID
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to create book",
            error: error.message
        });
    }
});

// PUT update a book
app.put("/books/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { title, author, price } = req.body;

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                message: "Invalid book ID"
            });
        }

        if (typeof title !== "string" || !title.trim() ||
            typeof author !== "string" || !author.trim() ||
            typeof price !== "number" || !Number.isFinite(price) || price < 0) {
            return res.status(400).json({
                message: "Title, author and a valid non-negative numeric price are required"
            });
        }

        const result = await execute(
            "UPDATE books SET title = ?, author = ?, price = ? WHERE id = ?",
            [title.trim(), author.trim(), price, id]
        );

        if (result.changes === 0) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        res.status(200).json({
            message: "Book updated successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to update book",
            error: error.message
        });
    }
});

// DELETE a book
app.delete("/books/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                message: "Invalid book ID"
            });
        }

        const result = await execute(
            "DELETE FROM books WHERE id = ?",
            [id]
        );

        if (result.changes === 0) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        res.status(200).json({
            message: "Book deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to delete book",
            error: error.message
        });
    }
});

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
