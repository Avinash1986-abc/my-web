const db = require('./Db');

async function check() {
    try {
        console.log("=== CHECKING DATABASE TABLES ===");
        const [tables] = await db.execute("SHOW TABLES");
        console.log("Tables:", tables.map(t => Object.values(t)[0]));

        const [columns] = await db.execute("DESCRIBE messages");
        console.log("\n=== COLUMNS IN messages TABLE ===");
        console.table(columns.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key })));

        const [msgs] = await db.execute("SELECT * FROM messages LIMIT 10");
        console.log("\n=== CHAT MESSAGES ===");
        console.table(msgs);
        
        process.exit(0);
    } catch (e) {
        console.error("Error checking chat:", e.message);
        process.exit(1);
    }
}

check();
