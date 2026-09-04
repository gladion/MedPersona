const express = require('express');
const cors = require('cors');
const path = require('path');

const { ensureDataFiles } = require('./lib/init');
const authRoutes = require('./routes/auth');
const caseRoutes = require('./routes/cases');
const adminRoutes = require('./routes/admin');

ensureDataFiles();

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Order matters: more specific prefixes must be registered before the
// generic '/api' router below, otherwise every /api/admin/* request would
// first pass through the doctor-oriented middleware in caseRoutes.
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', caseRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

// Friendly fallback for any unknown /api route
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Everything else falls back to the login page (simple multi-page app,
// each page guards itself client-side based on the stored token)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

module.exports = app;
