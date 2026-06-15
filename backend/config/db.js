const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.query("SELECT NOW()", (err, result) => {
  if (err) {
    console.error(err);
  } else {
    console.log("Neon connecté ✅");
    console.log(result.rows);
  }
});