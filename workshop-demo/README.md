# Workshop demo

A clickable demo of an HGV and commercial vehicle workshop system, built for George at
London Environmental Group to try on his phone and his laptop and tell us what is wrong with it.

It is a demo, not the real system. There is no backend, no Google, no live Xero connection and no
real data. Everything runs in the browser and is made up.

## Where it is

| App | Who uses it | Link |
|---|---|---|
| Office | Workshop manager and admin | <https://apexlineai.com/workshop-demo/> |
| Fitter | Fitters, on a phone | <https://apexlineai.com/workshop-demo/fitter> |
| Driver | Drivers, first use check | <https://apexlineai.com/workshop-demo/driver> |
| Customer portal | The operators you bill | <https://apexlineai.com/workshop-demo/portal> |

Cloudflare drops the `.html`, so `/workshop-demo/fitter.html` redirects to `/workshop-demo/fitter`.

Demo PIN: **240411**

Every page is `noindex` and nothing on the site links to them.

## Before this goes to a customer

The workshop is set up as **Noble Commercials Ltd** with placeholder details. No real company
record was used. Correct these in **Settings > The workshop** first:

- address, phone, email, website
- VAT number, company number, O licence number
- bank details printed on the invoice
- the brand colour and the two letter logo code

Changing them updates the sidebar, both phone apps, the portal and the invoices.

## What to try

**Office, on a laptop**

1. **Day planner.** Each fitter is a column with their 8 hours. Drag a job from "waiting to be
   planned" onto a fitter, or press **Fill the day** and it loads everyone by skill and spare time.
   The arrows reorder the day, and the bar turns amber then red as the day fills up.
2. **Live view.** The same columns, running. Green is inside the standard time, amber is close,
   red is over. The timer on a clocked on fitter counts up in real time.
3. **Workshop board.** Drag a vehicle into a bay.
4. **Authorisations.** Extra work the fitters have found, waiting on the customer.
5. **Driver checks.** This morning's walkarounds. A defect becomes a job card in one press.
6. **Invoices.** Labour from the clock ons, parts plus the customer's own markup, VAT.
   Connect Xero in Settings and new invoices post themselves.
7. **Parts and stock.** Bin locations, minimum levels, purchase orders, booking stock back in.
8. **Compliance planner** and **Earned Recognition** for the DVSA side.
9. **Hours for payroll.** Normal hours, overtime and wage cost, one file for the accountant.
10. **Reports.** Revenue by customer, margin, labour recovery and what each fitter contributed.

**Fitter, on a phone**

1. Tap a name, use the 4 digit PIN on the screen (Dave is 1111).
2. **My day** shows the jobs in order with the time each one is allowed.
3. Clock on. The office sees it within a few seconds.
4. **Found something else wrong** sends the customer a photo and a price, and the job waits.
5. The PMI sheet: every item Serviceable, Defect or N/A, brake figures, wheel re torque,
   two signatures. Once it is locked nobody can change it.
6. The microphone button speaks a note instead of typing it.

**Driver, on a phone**

Tap a name and PIN, walk round the vehicle, mark each item OK or Problem. A dangerous defect
puts the vehicle off the road and lands on the workshop board straight away.

**Customer portal**

Sign in as one of the operators and approve or decline the extra work, with the photo and the
price in front of you. Also their vehicles, compliance dates, inspection records and invoices.

## The flow worth showing George

Fitter finds a problem → sends it with a photo → customer approves on their phone →
the fitter is told to carry on → the time lands on the invoice → the invoice posts into Xero.
None of that exists in Truckfile or AssetMinder.

## PINs

| Who | PIN |
|---|---|
| Demo gate | 240411 |
| Dave Mitchell, foreman | 1111 |
| Marek Nowak | 2222 |
| Lee Barnard | 3333 |
| Sam Okafor | 4444 |
| Ryan Cole, mobile | 5555 |
| Drivers | shown on the driver login |
| Customer portal | shown on the portal login |

## How to reset it

Every page has a **Reset demo** button in the bar at the top. It puts the sample data back and
throws away anything you changed. Settings has the same button.

The demo reseeds itself if you come back on a different day, so the board is always dated today.

## How it is built

Plain HTML, CSS and JavaScript. No build step, no framework, no backend.

| File | What it does |
|---|---|
| `index.html` | Office app shell |
| `fitter.html` | Fitter app shell |
| `driver.html` | Driver walkaround app |
| `portal.html` | Customer portal |
| `app.css` | Shared styles, dark by default with a light toggle |
| `data.js` | Sample workshop, vehicles, jobs, stock and invoices, dated off today |
| `store.js` | Browser storage, planner maths, payroll, compliance, invoice maths, Xero |
| `ui.js` | Office shell: navigation, screen registry, modals, pointer drag and drop |
| `office.js` | Home, day planner, live view, board, book in, vehicles |
| `office2.js` | Job card, inspection sheet, authorisations, driver checks, quotes, campaigns |
| `office3.js` | Invoices and Xero, stock, compliance, Earned Recognition, timesheets, payroll, reports, settings |
| `fitter.js` | Fitter app, PMI sheet, signatures, extra work |
| `driver.js` | Driver walkaround |
| `portal.js` | Customer portal |

State lives in `localStorage` under keys starting `wsDemo:`. All four apps share it, which is how
the office picks up a fitter's clock on, and the fitter hears back about an approval, within a few
seconds. Nothing leaves the browser.

Dragging uses pointer events rather than HTML5 drag and drop, so a mouse drags and a finger taps.

`_screens/` holds test screenshots and is not committed.
