# Katta

Kannada: ಕಟ್ಟೆ, the stone bench under the tree where nobody planned to meet and everybody ends up.

A hangout planner for Bengaluru. You tell it what you can spend per head, roughly where you are, and how many of you there are. It puts three real plans on the table with the full bill on each one, and the group votes one in.

**[Live demo](https://YOUR-USERNAME.github.io/katta/)**

## The problem

Every friend group has the same conversation. Someone asks where to go. Four people say "anywhere". Three days later nobody went anywhere.

It usually falls apart for reasons that have nothing to do with a shortage of options:

1. Ask eight people at once and answering becomes everyone's job, so it becomes nobody's.
2. "What works for everyone" has no finish line, so the thread just runs until people lose interest.
3. The decision gets buried under fifty messages and someone has to ask again.
4. Half the argument is really about money, and nobody wants to be the one who says so.

Katta goes at the fourth one first, because every other app in this space skips it entirely. Meetup and BookMyShow assume you already know what you want. Splitwise turns up after the money is spent. Doodle and Rallly only sort out *when*. Nothing between them will tell you what an evening actually costs before you commit to it.

## What it does

Put in a budget, an area and a headcount, and you get three plans. Not forty, because groups get slower as the list gets longer.

Each plan carries a receipt. GST sits on top of service charge, the way it does on a printed bill. Booking fees, camera charges at the Palace, parking, shoe rental and the arcade card you will definitely end up buying are all in there. The big number is what leaves your account, not the menu price.

Travel is handled honestly. It shows up under every total but stays out of your cap, because the app has no idea where you are starting from. Tick "Count the travel" and it goes in, using metro fare where the area has a metro and shared autos where it doesn't. Plans that already include a cab, like Nandi Hills, don't get charged twice.

Voting needs nobody to install anything. Pass the phone round the table, or send one link and get a two-character code back that you paste into the group chat. It uses approval voting, so people tick everything they'd be happy with rather than picking a single favourite, which is what stops these things ending 1-1-1. Ties go to the cheaper plan.

Saved plans sit in your browser. There is no account and no server.

## Running it

One file. No build step, no dependencies, no npm install.

```
git clone https://github.com/YOUR-USERNAME/katta.git
cd katta
open index.html
```

To publish it, push to GitHub and turn on Pages under Settings, pointing at `main` and `/ (root)`. The share links use the URL hash, so they work on any static host.

## How the money is worked out

| Kind of place | How it's priced |
| --- | --- |
| Per-person venues | Mid-point of a real price band |
| Per-hour venues like turf and courts | Group rate divided by headcount, so more people is cheaper |
| Service charge | Applied to the base |
| GST | Applied to base plus service charge |
| Extras | Named line items: booking fee, camera charge, parking, arcade card |
| Getting there | Metro where there's a metro, shared autos where there isn't |
| Out-of-town trips | Cab is already in the group rate, so travel isn't added twice |

Prices are estimates for 2025 and 2026 and they will drift. Treat the total as a bracket, and ring ahead for anything that needs booking.

## Adding places

Everything lives in the `SPOTS` array near the top of the script. One object per place:

```js
{id:"vvpuram", n:"VV Puram Food Street", area:"basavanagudi", slot:"meal",
 anchor:true, mode:"head", lo:120, hi:280, hrs:2,
 when:["evening","night"], min:2, max:20,
 veg:true, booze:false, indoor:false,
 short:"a VV Puram food street loop",
 why:"Walk the whole lane once before buying anything, then split everything six ways.",
 note:"Nothing gets going before 6pm. Carry some cash, the busy stalls move faster on it."}
```

`mode` is one of `free`, `head` for per person, `ticket` for per person with a booking fee, or `group` for an hourly rate covering everyone.

`slot` is `meal`, `snack`, `sweet`, `coffee`, `activity` or `walk`. Two stops in the same plan never share a slot, which is what stops you being sent to two dinners.

`anchor` decides whether a place can be the main event or only tag along afterwards.

`area` is a key from `AREAS`, or `*` for things that exist all over the city. Stops after the first are pinned to the first stop's area, so a plan never sends the group across town.

`gst` and `svc` are percentages and both optional. `extras` takes `[{label, amt, per:"head"|"group"}]`.

## Tests

The logic is plain functions with no DOM in them, so it can be pulled straight out of the HTML and run in Node.

```
node test.js      # cost maths, filtering, ballots, share links
node ui.js        # boots the page in jsdom and drives every flow
node errcheck.js  # hammers every control combination looking for runtime errors
```

## Built by

- prajwalzv
- pratheekshareddysm24cs-art
- masoom-mm

## Licence

MIT. See [LICENSE](LICENSE).
