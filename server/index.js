const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('==========================================================');
  console.log('  MedSim Case Review Portal');
  console.log(`  Running at: http://localhost:${PORT}`);
  console.log('==========================================================');
});
