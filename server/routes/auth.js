const express = require('express');
const { readJson } = require('../lib/store');
const { issueToken, authenticate } = require('../lib/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const uname = String(username).trim().toLowerCase();

  const admin = readJson('admin', { username: 'admin', password: '1234', name: 'Administrator' });
  if (uname === String(admin.username).toLowerCase()) {
    if (String(password) !== String(admin.password)) {
      return res.status(401).json({ error: 'Incorrect username or password' });
    }
    const token = issueToken({ role: 'admin', username: admin.username, name: admin.name || 'Administrator' });
    return res.json({ token, user: { role: 'admin', username: admin.username, name: admin.name || 'Administrator' } });
  }

  const doctors = readJson('doctors', []);
  const doctor = doctors.find((d) => String(d.username).toLowerCase() === uname);
  if (!doctor) {
    return res.status(401).json({ error: 'Incorrect username or password' });
  }
  if (String(password) !== String(doctor.password)) {
    return res.status(401).json({ error: 'Incorrect username or password' });
  }

  const token = issueToken({ role: 'doctor', id: doctor.id, username: doctor.username, name: doctor.name });
  res.json({ token, user: { role: 'doctor', id: doctor.id, username: doctor.username, name: doctor.name } });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
