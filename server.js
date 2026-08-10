const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const DB_FILE = './db.json';

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/plans', (req, res) => {
  const db = readDB();
  res.json(db.plans);
});

app.post('/api/plans', (req, res) => {
  const db = readDB();
  const newPlan = { id: Date.now(), ...req.body };
  db.plans.push(newPlan);
  writeDB(db);
  res.json(newPlan);
});

app.post('/api/vote', (req, res) => {
  const db = readDB();
  const { planId } = req.body;
  if (!db.votes) db.votes = [];
  db.votes.push({ planId, timestamp: new Date() });
  writeDB(db);
  res.json({ success: true });
});

app.get('/api/results', (req, res) => {
  const db = readDB();
  res.json(db.votes || []);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
