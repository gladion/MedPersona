const path = require('path');
module.exports = {
  port: Number(process.env.PORT || 3000),
  sessionSecret: process.env.SESSION_SECRET || 'medsim-local-development-secret-change-in-production',
  defaultPassword: process.env.DEFAULT_PASSWORD || '1234',
  dataDir: path.join(__dirname, '..', 'data')
};
