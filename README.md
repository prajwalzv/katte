# Katta

**Kannada:** ಕಟ್ಟೆ — the stone bench under the tree where nobody planned to meet and everybody ends up.

A Full Stack hangout planner for Bengaluru. Enter your budget per head, area, and group size. It gives you three complete plans with the real final cost (including GST, service charge, parking, booking fees, and travel). Your group can vote on the plans using just a link — no login needed.

**Live Demo:** https://prajwalzv.github.io/katta

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js + Express
- **Database**: JSON file (db.json)
- **This is a Full Stack Project**

## Why I Built This

Every friend group in Bengaluru wastes time deciding where to go. Most arguments are really about money. Katta solves this by showing real final costs and allowing group voting without any app.

## What It Does

- Takes 3 inputs: budget per person, area, number of people
- Shows exactly 3 plans with full breakdown
- Saves plans to real backend database
- Records votes in the database
- Group voting works with a shareable link

## How to Run Locally (Full Stack)

```bash
git clone https://github.com/prajwalzv/katta.git
cd katta

# Install dependencies
npm install

# Start the backend server
npm start
