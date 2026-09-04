# Getting Katte online

There are two halves to this and they go to two different places. GitHub Pages can only serve files, it cannot run Node, so server.js has to live somewhere else.

## The site on GitHub Pages

Already done. Settings, then Pages, then deploy from branch main and the root folder. Every push to main updates it in about a minute.

At this point the site works using the built in list of Bengaluru places. Search and link voting will say the server is not running, which is true.

## The server on Render

Render has a free plan that is enough for this.

1. Sign up at render.com with your GitHub account.
2. New, then Web Service, then pick the katte repo.
3. Build command `npm install`, start command `npm start`.
4. Under Environment add a variable called `GOOGLE_MAPS_API_KEY` with your key as the value.
5. Create the service and wait for the first deploy.

Render gives you an address like `https://katte.onrender.com`. Open it. That copy of the site has search and voting fully working, because the server is right there.

Two quirks of the free plan. It sleeps after fifteen minutes of no traffic and takes about thirty seconds to wake up, so the first load after a quiet spell is slow. And the disk resets on redeploy, which means old ballots in db.json disappear. Neither matters for a demo. If you need ballots to survive, move them to a hosted Postgres later.

## Joining the two

If you want the GitHub Pages copy to use the Render server, open index.html, find the commented block near the bottom, uncomment it and put your Render address in:

```html
<script>window.KATTE_API = "https://katte.onrender.com";</script>
```

Push that and the Pages site starts using the live server for search and voting.

For a demo it is simpler to just present the Render address, since one address doing everything is easier to explain than two.

## The API key

1. console.cloud.google.com, make a project.
2. APIs and Services, then Library, then enable **Places API (New)**. Not the old Places API, the request format is different and the code will not work with it.
3. Credentials, then Create credentials, then API key.
4. Click the key and restrict it to the Places API so a leaked key cannot be used for anything else.
5. Billing needs a card on file even for free usage. Google will not charge you unless you cross the free allowance.

Set a budget alert while you are in there. Katte asks Google for opening hours and price level, and those fields put the request in the Enterprise tier, which is 1000 free calls a month. The server caches every search for twenty minutes so normal use stays well under that, but an alert is cheap insurance.

Never put the key in index.html. It only ever belongs in the server environment.
