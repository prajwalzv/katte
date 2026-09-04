# Katte

ಕಟ್ಟೆ is the stone bench under the tree where nobody planned to meet and everybody ends up.

Katte is a full stack web app for deciding where to go in Bengaluru. You put in what you can spend per head, roughly where you are, and how many of you there are. It gives you three plans with the real final cost on each one, and your group votes one in from a link.

Live site: https://prajwalzv.github.io/katte

## Why we built it

Every friend group has the same conversation. Somebody asks where to go, four people say "anywhere", and three days later nobody went anywhere.

Most of the argument is actually about money that nobody wants to bring up. So in Katte the budget goes first. Once the money is settled the rest gets a lot easier.

## What it does

You give it three things: budget per person, an area, and how many people. It gives back exactly three plans.

Every plan shows the full bill, not the menu price. GST goes on top of service charge the way it does on a real bill, and booking fees, camera charges, parking and shoe rental are all counted. Getting there and back is shown separately so you can see it without it eating your budget.

The seven areas people usually name are on the front page. For anywhere else there is a search box that covers the whole city, using live data from Google Maps. Search results show whether a place is open right now, its Google rating, and roughly what one person spends there. Closed places still show up with a closed label, because sometimes you are planning for tomorrow.

Nothing in the app costs zero. Even a walk in Cubbon Park means a chai and an auto, so that is what it says.

Voting works from one link. The shortlist gets saved to the server, everyone opens the link and ticks whatever they are fine with, and the votes come back to whoever started it. Nobody has to install anything or make an account. If two plans tie, the cheaper one wins.

## Tech stack

Frontend is plain HTML, CSS and JavaScript in one file. No framework and no build step.

Backend is Node.js with Express. It serves the site, proxies the Google Places API so the key never reaches the browser, and stores ballots and votes.

Database is db.json, a JSON file on disk. Small project, very few writes, so a file does the job. Writes go to a temporary file first and then get renamed, so a crash halfway through cannot leave a half written database.

## REST API

| Method | Route | What it does |
| --- | --- | --- |
| GET | /api/health | Is the server up, is live search on |
| GET | /api/places/search?q= | Search any place in Bengaluru |
| GET | /api/places/nearby?lat=&lng=&kind= | Things near a chosen place |
| POST | /api/plans | Save a shortlist, returns a 6 character ballot code |
| GET | /api/plans/:id | Load a ballot |
| POST | /api/plans/:id/votes | Cast or change a vote |
| GET | /api/plans/:id/votes | Running count and the winner |

## Running it

You need Node 18 or newer.

```
git clone https://github.com/prajwalzv/katte.git
cd katte
npm install
npm start
```

Then open http://localhost:3000

It works straight away using the built in list of 55 Bengaluru places. Live city wide search needs a Google key, see below.

## Turning on live search

1. Go to Google Cloud Console and make a project.
2. Enable **Places API (New)**. The old Places API will not work, the request shape is different.
3. Make an API key under Credentials, then restrict it to the Places API.
4. Copy .env.example to .env and paste the key in.
5. Restart the server.

Two things worth knowing before you turn it on. Google needs a card on the billing account even for the free usage. And because Katte asks for opening hours and price level, the requests fall in Google's Enterprise tier, which allows 1000 free calls a month and then charges. That is why every search is cached on the server for twenty minutes, so the same search never costs twice.

Without a key the search box politely says so and the rest of the app carries on working.

## Running the backend somewhere real

GitHub Pages only serves static files, so it cannot run server.js. The live link above works but with live search turned off.

To get the whole thing running, deploy the repo to a free Node host like Render, set GOOGLE_MAPS_API_KEY in its environment settings, and then add one line to index.html before the closing body tag so the GitHub Pages copy talks to it:

```html
<script>window.KATTE_API = "https://your-app.onrender.com";</script>
```

## Tests

```
node test.js         cost maths, filtering, ballots
node ui.js           loads the page and clicks through every screen
node api.test.js     every API route over http
node google.test.js  the Google request and how the response is read
```

## Cost estimates

Prices for the built in places are our own estimates for 2025 and 2026, from published rates and what these places actually cost. For places that come from live search, the per head figure is worked out from Google's price level, so treat it as a bracket and not a quote. Menus move and turf gets dearer on a Friday.

## Team

| Name | USN |
| --- | --- |
| Prajwal Vidyasagar | 1RX24CS172 |
| Pratheeksha Reddy S M | 1RX24CS181 |
| B Masoom | 1RN24CS043 |

## Licence

MIT, see LICENSE.
