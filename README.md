# South Africa Coffee Finder

Static coffee-finder website focused on South Africa.

## What’s included

- Glassmorphism navbar
- Mobile sidebar (hamburger menu) on small screens
- Hero section with floating coffee cup
- “Top picks” list
- “Near you” sorting using browser geolocation (closest first)
- Live Google Maps embed (South Africa coffee search)
- Footer: Developed by Ridwaan Salie

## Run it

Geolocation typically requires a secure context (HTTPS) or `http://localhost`.

- Easiest: open the folder in VS Code and use the “Live Server” extension.
- Or use any local web server you already have (serve this folder and open `index.html`).

## Location sorting behavior

- On load, the page requests location permission so it can sort closest-first.
- If you decline, it still shows all shops (unsorted). You can retry via “Use my location” (navbar or mobile sidebar).

## Add / edit shops

Edit the `SHOP_DATA` array in `js.js`.

To show ratings, manually fill:

- `googleRating` (number, 0–5)
- `googleRatingsTotal` (number)

For always-up-to-date ratings from Google, you’ll need a backend/proxy that calls Google Places (client-side calls are usually blocked by CORS).
