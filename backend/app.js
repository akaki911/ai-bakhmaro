// Disable local Express listener under Firebase Functions
process.env.DISABLE_EXPRESS_LISTEN = 'true';

const app = require('./index'); // This must export a pure Express app

// ✅ Export Express app WITH root mount (no '/api' here)
// Firebase Functions will attach '/api' path
app.use('/api/secrets', require('./routes/secrets'));
app.use('/api/keys', require('./routes/api_keys'));
module.exports = app;