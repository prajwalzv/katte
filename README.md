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

Frontend is plain HTML, CSS and JavaScript in one file. No framework and no build step, which is why it runs on GitHub Pages with nothing else needed.

Backend is Node.js with Express. It serves the site and stores ballots and votes through a REST API.

Database is db.json, a JSON file on disk. Small project, very few writes, so a file does the job. Writes go to a temporary file first and then get renamed, so a crash halfway through cannot leave a half written database.

The two halves are deliberately not welded together. The page works on its own, and picks up the server when there is one. Run `npm start` and the same page starts saving ballots to the database instead of putting them in the link.

## REST API

| Method | Route | What it does |
| --- | --- | --- |
| GET | /api/health | Is the server up |
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

## Turning on city wide search

Out of the box you get the seven areas and 55 places we wrote ourselves. To search the rest of Bengaluru you need a Google key.

1. Go to Google Cloud Console and make a project.
2. Enable **Places API (New)** and **Maps JavaScript API**. Both, not just one.
3. Make an API key under Credentials.
4. Restrict it to **HTTP referrers** and add `https://prajwalzv.github.io/*`. This matters. The key sits in the page, and the referrer restriction is what stops anyone else spending your quota with it.
5. Open index.html, find the line near the top of the script that reads `var MAPS_KEY = "";` and paste the key between the quotes.

Google needs a card on the billing account even for free usage, so set a budget alert while you are in there. Searches are cached in the page, so repeating the same search costs nothing.

Leave MAPS_KEY empty and the search box simply does not appear. Nothing breaks and nothing looks half finished.

The browser talks to Google through the Maps JavaScript library rather than the plain web service, because Google blocks browser requests to the latter.

## Running the backend somewhere real

GitHub Pages only serves files, so it cannot run server.js. That is fine, the site is built to work without it.

If you want ballots stored in the database instead of carried in the link, deploy the repo to a free Node host like Render and open that address instead. The page notices the server is there and offers to collect votes for you.

## Tests

```
node test.js               cost maths, filtering, ballots
node pages.test.js         the page exactly as GitHub Pages serves it
node maps.test.js          the whole Google search path
node load.test.js          20000 rolls, 5000 links, 2000 vote counts
node browser.load.test.js  600 full UI cycles, checking for leaks
node api.test.js           every API route over http
node served.test.js        the page and server together, end to end
```

## Cost estimates

Prices for the built in places are our own estimates for 2025 and 2026, from published rates and what these places actually cost. For places that come from live search, the per head figure is worked out from Google's price level, so treat it as a bracket and not a quote. Menus move and turf gets dearer on a Friday.

## Team

| Name | USN |
| --- | --- |
| Prajwal Vidyasagar | 1RX24CS172 |
| Pratheeksha Reddy S M | 1RX24CS181 |

## Licence

MIT, see LICENSE.
