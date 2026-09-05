# Putting Katte online

The site is one HTML file and it runs on GitHub Pages with nothing else. Everything below is optional.

## What already works, with no setup

Upload index.html and turn on Pages. You get the seven areas, all 55 places, three costed plans, rerolling, and both ways of voting. The link people vote through carries the plans inside itself, so no server is involved at any point.

## Adding city wide search

You need a Google key for this. Without one the search box does not appear at all, and nothing else changes.

1. console.cloud.google.com, make a project.
2. APIs and Services, then Library. Enable **Places API (New)** and **Maps JavaScript API**. You need both.
3. Credentials, then Create credentials, then API key.
4. Click the key. Under Application restrictions choose **HTTP referrers** and add:
   ```
   https://prajwalzv.github.io/*
   ```
   Do this properly. The key travels to the browser, and that restriction is the thing stopping strangers from spending your quota.
5. Under API restrictions, tick only the two APIs above.
6. Open index.html. Near the top of the script there is a line:
   ```js
   var MAPS_KEY = "";
   ```
   Put your key between the quotes and save.
7. Upload the file again.

Google wants a card on file even for free usage, so set a budget alert at the same time. Searches are remembered inside the page, so the same search never costs twice in one visit.

If you also run the site locally, add `http://localhost:3000/*` to the referrer list.

## Adding the server

You only need this if you want ballots kept in a database instead of carried in the link. With the server running, voters just tap send and the results appear for whoever started the vote, with no replies to paste.

Locally:

```
npm install
npm start
```

Then open http://localhost:3000

Online, on Render's free plan:

1. render.com, sign in with GitHub.
2. New, then Web Service, then pick the katte repo.
3. Build command `npm install`, start command `npm start`.
4. Create it and wait for the first deploy.

Render gives you an address like `https://katte.onrender.com`. Open that instead of the Pages link and the vote collecting appears on its own.

Two quirks of the free plan. It sleeps after fifteen minutes of quiet and takes about thirty seconds to wake, so the first load can be slow. And the disk wipes on redeploy, so old ballots vanish. Neither matters for a demo.

## Which link to show people

For a class demo, show the Render address if you set one up, because one address doing everything is easier to explain. Otherwise the GitHub Pages link is completely fine and everything visible on screen works.
