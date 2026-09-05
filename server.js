const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "db.json");

app.use(cors());
app.use(express.json({ limit: "256kb" }));

/* db.json is the whole database. Small project, few writes, a file is enough. */
function readDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const db = JSON.parse(raw);
    if (!db.plans) db.plans = {};
    if (!db.votes) db.votes = {};
    return db;
  } catch (e) {
    return { plans: {}, votes: {} };
  }
}

function writeDb(db) {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, DB_FILE);
}

function newId() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

app.get("/api/health", function (req, res) {
  res.json({ ok: true, plans: Object.keys(readDb().plans).length });
});

/* Save a shortlist so the group can vote on it */
app.post("/api/plans", function (req, res) {
  const body = req.body || {};
  if (!Array.isArray(body.plans) || !body.plans.length) {
    return res.status(400).json({ error: "Send at least one plan" });
  }
  if (body.plans.length > 5) {
    return res.status(400).json({ error: "Five plans is the most a group will vote on" });
  }

  const db = readDb();
  let id = newId();
  while (db.plans[id]) id = newId();

  db.plans[id] = {
    id: id,
    createdAt: new Date().toISOString(),
    people: Number(body.people) || 4,
    budget: Number(body.budget) || 0,
    area: String(body.area || "").slice(0, 80),
    plans: body.plans.slice(0, 5),
  };
  db.votes[id] = [];
  writeDb(db);

  res.status(201).json({ id: id, url: "/#v=" + id });
});

app.get("/api/plans/:id", function (req, res) {
  const db = readDb();
  const row = db.plans[String(req.params.id).toUpperCase()];
  if (!row) return res.status(404).json({ error: "No such ballot" });
  res.json(row);
});

/* One vote per name. Voting again replaces your earlier vote. */
app.post("/api/plans/:id/votes", function (req, res) {
  const id = String(req.params.id).toUpperCase();
  const db = readDb();
  if (!db.plans[id]) return res.status(404).json({ error: "No such ballot" });

  const name = String((req.body && req.body.name) || "").trim().slice(0, 40);
  const picks = (req.body && req.body.picks) || [];
  if (!name) return res.status(400).json({ error: "Put your name in so they know whose vote it is" });
  if (!Array.isArray(picks)) return res.status(400).json({ error: "picks must be a list" });

  const total = db.plans[id].plans.length;
  const clean = picks
    .map(Number)
    .filter(function (n) {
      return Number.isInteger(n) && n >= 0 && n < total;
    })
    .slice(0, total);

  if (!db.votes[id]) db.votes[id] = [];
  db.votes[id] = db.votes[id].filter(function (v) {
    return v.name.toLowerCase() !== name.toLowerCase();
  });
  db.votes[id].push({ name: name, picks: clean, at: new Date().toISOString() });
  writeDb(db);

  res.status(201).json({ ok: true, voters: db.votes[id].length });
});

app.get("/api/plans/:id/votes", function (req, res) {
  const id = String(req.params.id).toUpperCase();
  const db = readDb();
  const row = db.plans[id];
  if (!row) return res.status(404).json({ error: "No such ballot" });

  const votes = db.votes[id] || [];
  const scores = row.plans.map(function () {
    return 0;
  });
  votes.forEach(function (v) {
    v.picks.forEach(function (i) {
      if (scores[i] !== undefined) scores[i]++;
    });
  });

  let best = -1;
  let tied = [];
  scores.forEach(function (s, i) {
    if (s > best) {
      best = s;
      tied = [i];
    } else if (s === best) {
      tied.push(i);
    }
  });

  /* A tie goes to whichever plan costs less. Somebody has to decide. */
  let winner = tied[0];
  let brokeTie = false;
  if (tied.length > 1 && best > 0) {
    brokeTie = true;
    tied.forEach(function (i) {
      if ((row.plans[i].perHead || 0) < (row.plans[winner].perHead || 0)) winner = i;
    });
  }

  res.json({
    id: id,
    voters: votes.map(function (v) {
      return v.name;
    }),
    scores: scores,
    top: best,
    winner: best > 0 ? winner : null,
    brokeTie: brokeTie,
    plans: row.plans,
    people: row.people,
  });
});

app.use(express.static(__dirname, { extensions: ["html"] }));

app.use(function (req, res) {
  if (req.path.indexOf("/api/") === 0) return res.status(404).json({ error: "No such endpoint" });
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, function () {
  console.log("Katte running on http://localhost:" + PORT);
});
