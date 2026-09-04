const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// One promise queue per file path so concurrent writes never interleave.
const queues = new Map();

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readJson(name, fallback) {
  const p = filePath(name);
  if (!fs.existsSync(p)) {
    writeJsonSync(name, fallback);
    return JSON.parse(JSON.stringify(fallback));
  }
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to read ${name}.json, resetting to fallback.`, e);
    writeJsonSync(name, fallback);
    return JSON.parse(JSON.stringify(fallback));
  }
}

function writeJsonSync(name, data) {
  const p = filePath(name);
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, p);
}

function writeJson(name, data) {
  const prev = queues.get(name) || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => writeJsonSync(name, data));
  queues.set(name, next);
  return next;
}

/**
 * Atomically read-modify-write a JSON file. `mutator` receives the current
 * value and must return the new value.
 */
function update(name, fallback, mutator) {
  const prev = queues.get(name) || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => {
      const current = readJson(name, fallback);
      const updated = mutator(current);
      writeJsonSync(name, updated);
      return updated;
    });
  queues.set(name, next);
  return next;
}

module.exports = { readJson, writeJson, update, DATA_DIR };
