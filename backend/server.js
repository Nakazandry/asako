const app = require('./src/app');
const pool = require('./config/db');

const PORT = process.env.PORT || 5000;


const server = app.listen(PORT, () => {
  console.log(`ASAKO API running on port ${PORT}`);

});


const shutdown = async () => {
  await pool.end();
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
