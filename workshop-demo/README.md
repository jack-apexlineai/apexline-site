# Workshop demo

A clickable demo of an HGV and commercial vehicle workshop system, built for George at
London Environmental Group to try on his phone and his laptop and tell us what is wrong with it.

It is a demo, not the real system. There is no backend, no Google, no Xero connection and no
real data. Everything runs in the browser and is made up.

## Where it is

- Office app: <https://apexlineai.com/workshop-demo/>
- Fitter app: <https://apexlineai.com/workshop-demo/fitter.html>

Demo PIN: **240411**

The pages are `noindex` and nothing on the site links to them.

## What to try

**Office, on a laptop**

1. Home for the day's numbers, then Workshop board.
2. Drag a vehicle from "Waiting to go in" onto a bay. On a phone, open the card and pick the bay.
3. Book in a vehicle, then watch it appear on the board.
4. Live view follows the fitters as they clock on and off.
5. Invoices: create one from a finished job, print it, then Export to Xero. Export again and it
   tells you there is nothing new.
6. Compliance planner for the next six months of PMIs, tests, brake tests, tacho and LOLER.
7. Timesheets, straight off the clock ons, with a CSV export.

**Fitter, on a phone**

1. Open the fitter app, tap a name, use the 4 digit PIN shown on the screen (Dave is 1111).
2. Clock on to a job. The timer runs and the office sees it within a few seconds.
3. Open the PMI inspection sheet: set every item to Serviceable, Defect or N/A, put the brake
   figures in, tick the wheel re torque, then sign twice. Once it is locked nobody can change it.
4. Job done sends it to the office for QC.

## Fitter PINs

| Fitter | PIN |
|---|---|
| Dave Mitchell | 1111 |
| Marek Nowak | 2222 |
| Lee Barnard | 3333 |
| Sam Okafor | 4444 |

## How to reset it

Every page has a **Reset demo** button in the bar at the top. It puts the sample data back the way
it was and throws away anything you changed. Settings has the same button.

The demo also reseeds itself if you come back on a different day, so the board is always dated today.

## How it is built

Plain HTML, CSS and JavaScript. No build step, no framework, no backend.

| File | What it does |
|---|---|
| `index.html` | Office app shell |
| `fitter.html` | Fitter app shell |
| `app.css` | Shared styles, dark by default with a light toggle |
| `data.js` | Sample workshop, vehicles, jobs and invoices, dated off today |
| `store.js` | Browser storage, PIN gate, toasts, formatting, compliance and invoice maths |
| `office.js` | Every office screen |
| `fitter.js` | Fitter app, inspection sheet, signatures |

State lives in `localStorage` under keys starting `wsDemo:`. The two apps share it, which is how the
office picks up a fitter's clock on within a few seconds. Nothing leaves the browser.

`_screens/` holds test screenshots and is not committed.
