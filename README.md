# Katta

**Kannada:** ಕಟ್ಟೆ — the stone bench under the tree where nobody planned to meet and everybody ends up.

A simple hangout planner for Bengaluru. Enter your budget per head, area, and group size. It gives you three complete plans with the real final cost (including GST, service charge, parking, booking fees, and travel). Your group can vote on the plans using just a link — no login needed.

**Live Demo:** https://prajwalzv.github.io/katta

## Why I Built This

Every friend group in Bengaluru has the same problem — “Where should we go?” The conversation drags on for days because no one wants to decide the budget or deal with the maths. Most apps either assume you already know what you want or only help with dates. Katta solves the money part first.

## What It Does

- Takes 3 inputs: budget per person, area, number of people
- Shows exactly 3 plans with full breakdown (GST, service charge, extras, travel)
- Group voting works with a shareable link (no app install)
- Uses approval voting so everyone can select multiple options they like
- Everything is saved in the browser (no account, no server)

## How to Run Locally

```bash
git clone https://github.com/prajwalzv/katta.git
cd katta
open index.html
