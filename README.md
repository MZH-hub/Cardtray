# Cardtray — digital business cards on GitHub Pages

A tiny static site for managing digital business cards. No backend, no build step.

- **index.html** — your tray: add, edit, delete cards (saved in this browser's `localStorage`)
- **card.html** — the shareable view for one card (reads its data from the link itself)
- Every card can be shared as a **link** or a **QR code** that opens `card.html` with that card's info baked into the URL — so it works for anyone, on any device, with no database.

## Deploy it in 3 steps

1. Create a new GitHub repo (e.g. `cardtray`) and upload these four files to the root:
   `index.html`, `card.html`, `style.css`, `app.js`
2. In the repo, go to **Settings → Pages**, set **Source** to your default branch (usually `main`), folder `/root`, then save.
3. Wait a minute, then visit the URL GitHub gives you, e.g.
   `https://yourusername.github.io/cardtray/`

That's it — no server, no dependencies to install.

## How sharing works

Clicking **Copy link** or **Open card** builds a URL like:

```
.../card.html?d=eyJuIjoiQWRhIiwidCI6Ik1hdGhlbWF0aWNpYW4ifQ
```

The `d` parameter is the card's details, compressed and encoded right into the link. Opening that link (or scanning its QR code) renders the card — no lookup, no server, no expiring data. Anyone with the link can view the card and save it to their contacts (as a `.vcf` file), even if they've never visited your tray.

Note: this means the link length grows a bit with how much you put in the card (name, title, bio, etc.) — that's normal and still scans fine as a QR code.

## Notes

- Cards you create only show up in **your** tray, in the browser/device you made them on (localStorage doesn't sync across devices). The shareable link/QR, however, works for anyone.
- To edit branding, colors, or fonts, everything lives in `style.css`.
- QR codes are generated client-side via [qrcodejs](https://github.com/davidshimjs/qrcodejs) (loaded from a CDN).
