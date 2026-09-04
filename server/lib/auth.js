const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// The signing secret is generated once and persisted locally so tokens
// survive server restarts. It is never meant to be committed to git.
const SECRET_PATH = path.join(__dirname, '..', '..', 'data', '.session-secret');

function getSecret() {
  const dir = path.dirname(SECRET_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(SECRET_PATH)) {
    return fs.readFileSync(SECRET_PATH, 'utf-8').trim();
  }
  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(SECRET_PATH, secret, 'utf-8');
  return secret;
}

const SECRET = process.env.SESSION_SECRET || getSecret();

function issueToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '12h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Session expired, please log in again' });
  req.user = payload;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireDoctor(req, res, next) {
  if (!req.user || (req.user.role !== 'doctor' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Doctor access required' });
  }
  next();
}

module.exports = { issueToken, verifyToken, authenticate, requireAdmin, requireDoctor };
