/*
  Ratings note:
  - Google ratings change often, and Google Places endpoints are not CORS-friendly for direct browser calls.
  - For up-to-date ratings, run a tiny backend/proxy (serverless function / Express) that calls Google Places,
    then return {name, rating, user_ratings_total, lat, lng} to this frontend.
  - Until then, you can also manually add `googleRating` and `googleRatingsTotal` per shop below.
*/

const SHOP_DATA = [
  {
    id: "father-coffee-braamfontein",
    name: "Father Coffee",
    area: "Braamfontein",
    lat: -26.19296,
    lng: 28.0347,
    mapsQuery: "Father Coffee Braamfontein",
    googleRating: null,
    googleRatingsTotal: null,
  },
  {
    id: "bean-there-44-stanley",
    name: "Bean There Coffee Company",
    area: "44 Stanley (Milpark)",
    lat: -26.18897,
    lng: 28.00163,
    mapsQuery: "Bean There Coffee Company 44 Stanley Johannesburg",
    googleRating: null,
    googleRatingsTotal: null,
  },
  {
    id: "salvation-cafe-44-stanley",
    name: "Salvation Cafe",
    area: "44 Stanley (Milpark)",
    lat: -26.1885,
    lng: 28.0022,
    mapsQuery: "Salvation Cafe 44 Stanley Johannesburg",
    googleRating: null,
    googleRatingsTotal: null,
  },
  {
    id: "the-whippet-linden",
    name: "The Whippet Coffee",
    area: "Linden",
    lat: -26.1397,
    lng: 27.9974,
    mapsQuery: "The Whippet Coffee Linden Johannesburg",
    googleRating: null,
    googleRatingsTotal: null,
  },
  {
    id: "doubleshot-parktown-north",
    name: "Double Shot Coffee & Tea",
    area: "Parktown North",
    lat: -26.1449,
    lng: 28.0304,
    mapsQuery: "Double Shot Coffee & Tea Parktown North Johannesburg",
    googleRating: null,
    googleRatingsTotal: null,
  },
  {
    id: "starbucks-sandton-city",
    name: "Starbucks",
    area: "Sandton",
    lat: -26.1086,
    lng: 28.053,
    mapsQuery: "Starbucks Sandton City",
    googleRating: null,
    googleRatingsTotal: null,
  },
  {
    id: "starbucks-rosebank",
    name: "Starbucks",
    area: "Rosebank",
    lat: -26.1469,
    lng: 28.0423,
    mapsQuery: "Starbucks Rosebank Johannesburg",
    googleRating: null,
    googleRatingsTotal: null,
  },
];

const TOP_PICK_IDS = [
  "father-coffee-braamfontein",
  "bean-there-44-stanley",
  "the-whippet-linden",
  "doubleshot-parktown-north",
  "starbucks-sandton-city",
];

const els = {
  topPicksGrid: document.getElementById("topPicksGrid"),
  nearYouGrid: document.getElementById("nearYouGrid"),
  geoStatus: document.getElementById("geoStatus"),
  btnNearMe: document.getElementById("btnNearMe"),
  btnLocate: document.getElementById("btnLocate"),
  btnHeroLocate: document.getElementById("btnHeroLocate"),
  btnReset: document.getElementById("btnReset"),
  searchForm: document.getElementById("searchForm"),
  navSearch: document.getElementById("navSearch"),
  btnMenu: document.getElementById("btnMenu"),
  mobileDrawer: document.getElementById("mobileDrawer"),
  btnDrawerClose: document.getElementById("btnDrawerClose"),
  drawerSearchForm: document.getElementById("drawerSearchForm"),
  drawerSearch: document.getElementById("drawerSearch"),
  btnDrawerLocate: document.getElementById("btnDrawerLocate"),
};

const state = {
  query: "",
  user: null,
};

function setMenuExpanded(expanded) {
  if (!els.btnMenu) return;
  els.btnMenu.setAttribute("aria-expanded", expanded ? "true" : "false");
}

function isMobileWidth() {
  return window.matchMedia?.("(max-width: 560px)")?.matches ?? window.innerWidth <= 560;
}

function openDrawer() {
  if (!isMobileWidth()) return;
  const d = els.mobileDrawer;
  if (!d) return;
  try {
    if (typeof d.showModal === "function") d.showModal();
    else d.setAttribute("open", "");
    document.body.style.overflow = "hidden";
    setMenuExpanded(true);
  } catch {
    // ignore
  }
}

function closeDrawer() {
  const d = els.mobileDrawer;
  if (!d) return;
  try {
    if (typeof d.close === "function") d.close();
    else d.removeAttribute("open");
  } catch {
    // ignore
  }
  document.body.style.overflow = "";
  setMenuExpanded(false);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toMapsSearchUrl(query) {
  const q = encodeURIComponent(query);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function toDirectionsUrl(query) {
  const destination = encodeURIComponent(query);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

function formatKm(km) {
  if (!Number.isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function starsFillPercent(rating) {
  if (!Number.isFinite(rating)) return 0;
  return clamp((rating / 5) * 100, 0, 100);
}

function ratingText(rating, ratingsCount) {
  if (!Number.isFinite(rating)) return "Rating: -";
  const base = `Rating: ${rating.toFixed(1)} / 5`;
  if (!Number.isFinite(ratingsCount)) return base;
  return `${base} (${ratingsCount.toLocaleString()} reviews)`;
}

function card(shop, options) {
  const distanceLabel = Number.isFinite(options?.distanceKm)
    ? formatKm(options.distanceKm)
    : null;
  const showDistance = Boolean(distanceLabel);

  const rating = shop.googleRating;
  const ratingsCount = shop.googleRatingsTotal;
  const mapsSearchUrl = toMapsSearchUrl(shop.mapsQuery);
  const directionsUrl = toDirectionsUrl(shop.mapsQuery);

  const ratingLabel = ratingText(rating, ratingsCount);
  const fill = starsFillPercent(rating);

  const cardEl = document.createElement("article");
  cardEl.className = "card";
  cardEl.innerHTML = `
    <div class="card__top">
      <h3 class="card__title">${escapeHtml(shop.name)}</h3>
      <div class="meta">
        <span class="meta__item" title="Area">Area: ${escapeHtml(shop.area)}</span>
        ${
          showDistance
            ? `<span class="meta__item" title="Distance">Distance: ${distanceLabel}</span>`
            : ""
        }
      </div>
      <div class="meta">
        <span class="stars" aria-label="${escapeHtml(ratingLabel)}">
          <span class="stars__bar" style="--fill:${fill}%"></span>
          <span>${escapeHtml(ratingLabel)}</span>
        </span>
      </div>
    </div>
    <div class="card__actions">
      <a class="btn btn--ghost" href="${mapsSearchUrl}" target="_blank" rel="noreferrer">Open in Maps</a>
      <a class="btn" href="${directionsUrl}" target="_blank" rel="noreferrer">Directions</a>
    </div>
  `;
  return cardEl;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setGeoStatus(message, kind) {
  if (!message) {
    els.geoStatus.hidden = true;
    els.geoStatus.textContent = "";
    els.geoStatus.style.borderColor = "";
    return;
  }
  els.geoStatus.hidden = false;
  els.geoStatus.textContent = message;
  const border =
    kind === "error"
      ? "rgba(239, 68, 68, 0.30)"
      : kind === "success"
        ? "rgba(34, 197, 94, 0.30)"
        : "rgba(11, 18, 32, 0.10)";
  els.geoStatus.style.borderColor = border;
}

function normalizeQuery(q) {
  return String(q ?? "").trim().toLowerCase();
}

function shopMatches(shop, query) {
  if (!query) return true;
  const haystack = `${shop.name} ${shop.area}`.toLowerCase();
  return haystack.includes(query);
}

function filteredShops() {
  const q = state.query;
  return SHOP_DATA.filter((s) => shopMatches(s, q));
}

function messageCard(text) {
  const cardEl = document.createElement("article");
  cardEl.className = "card";
  cardEl.innerHTML = `
    <div class="card__top">
      <h3 class="card__title">${escapeHtml(text)}</h3>
      <p class="muted" style="margin:0">Try a different search.</p>
    </div>
  `;
  return cardEl;
}

function renderTopPicks() {
  const q = state.query;
  if (q) {
    const results = filteredShops();
    if (results.length === 0) {
      els.topPicksGrid.replaceChildren(messageCard(`No matches for “${q}”.`));
      return;
    }
    if (state.user) {
      const withDistance = results
        .map((shop) => ({ shop, distanceKm: haversineKm(state.user, shop) }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
      els.topPicksGrid.replaceChildren(...withDistance.map((x) => card(x.shop, x)));
      return;
    }
    els.topPicksGrid.replaceChildren(...results.map((s) => card(s)));
    return;
  }

  const top = TOP_PICK_IDS.map((id) => SHOP_DATA.find((s) => s.id === id)).filter(Boolean);
  if (state.user) {
    const withDistance = top
      .map((shop) => ({ shop, distanceKm: haversineKm(state.user, shop) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
    els.topPicksGrid.replaceChildren(...withDistance.map((x) => card(x.shop, x)));
    return;
  }
  els.topPicksGrid.replaceChildren(...top.map((s) => card(s)));
}

function renderNearYou(shopsWithDistance) {
  if (shopsWithDistance.length === 0) {
    const q = state.query;
    els.nearYouGrid.replaceChildren(
      messageCard(q ? `No matches for “${q}”.` : "No results.")
    );
    return;
  }
  els.nearYouGrid.replaceChildren(...shopsWithDistance.map((x) => card(x.shop, x)));
}

function resetNearYou() {
  state.user = null;
  const q = state.query;
  const list = filteredShops().map((shop) => ({ shop, distanceKm: null }));
  if (q) {
    setGeoStatus(`Showing results for “${q}”.`, "info");
  } else {
    setGeoStatus("", "info");
  }
  renderNearYou(list);
  renderTopPicks();
}

async function locateAndSort(options = {}) {
  const list = filteredShops();
  if (list.length === 0) {
    const q = state.query;
    setGeoStatus(q ? `No matches for “${q}”.` : "No results.", "error");
    renderNearYou([]);
    return;
  }

  const silent = options?.silent === true;
  if (!silent) setGeoStatus("Requesting your location...", "info");

  if (!("geolocation" in navigator)) {
    if (!silent) setGeoStatus("Geolocation is not supported in this browser.", "error");
    return;
  }

  const pos = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30_000,
    });
  }).catch((err) => {
    const denied = err?.code === 1;
    const msg = denied
      ? "Showing all shops. Allow location to sort closest-first."
      : "Could not get your location. Try again.";
    if (!silent) setGeoStatus(msg, denied ? "info" : "error");
    return null;
  });

  if (!pos) return;

  state.user = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  const shopsWithDistance = list.map((shop) => ({
    shop,
    distanceKm: haversineKm(state.user, shop),
  })).sort((a, b) => a.distanceKm - b.distanceKm);

  const q = state.query;
  setGeoStatus(
    q ? `Sorted “${q}” by distance (closest first).` : "Sorted by distance (closest first).",
    "success"
  );
  renderNearYou(shopsWithDistance);
  renderTopPicks();
}

function applySearch(rawQuery) {
  state.query = normalizeQuery(rawQuery);
  const next = String(rawQuery ?? "");
  if (els.navSearch && els.navSearch.value !== next) els.navSearch.value = next;
  if (els.drawerSearch && els.drawerSearch.value !== next) els.drawerSearch.value = next;

  renderTopPicks();

  if (state.user) {
    const list = filteredShops();
    const shopsWithDistance = list
      .map((shop) => ({
        shop,
        distanceKm: haversineKm(state.user, shop),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
    renderNearYou(shopsWithDistance);
    if (state.query) {
      setGeoStatus(`Sorted “${state.query}” by distance (closest first).`, "success");
    } else {
      setGeoStatus("Sorted by distance (closest first).", "success");
    }
    return;
  }

  resetNearYou();
}

async function tryAutoLocateOnLoad() {
  try {
    if (!navigator.permissions?.query) return;
    const perm = await navigator.permissions.query({ name: "geolocation" });
    if (perm?.state === "denied") return;

    if (perm?.state === "granted") {
      await locateAndSort({ silent: true });
      return;
    }

    // If the browser will prompt, do it on load so the closest shops show first.
    // If the user declines, the page still shows the full South Africa list.
    await locateAndSort({ silent: false });
  } catch {
    // ignore
  }
}

function init() {
  renderTopPicks();
  resetNearYou();
  els.btnNearMe?.addEventListener("click", locateAndSort);
  els.btnLocate?.addEventListener("click", locateAndSort);
  els.btnHeroLocate?.addEventListener("click", locateAndSort);
  els.btnDrawerLocate?.addEventListener("click", async () => {
    await locateAndSort();
    closeDrawer();
  });
  els.btnReset?.addEventListener("click", resetNearYou);

  els.searchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    applySearch(els.navSearch?.value);
  });

  els.drawerSearchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    applySearch(els.drawerSearch?.value);
    closeDrawer();
  });

  els.navSearch?.addEventListener("input", () => {
    if (!els.navSearch) return;
    if (els.navSearch.value.trim() === "") applySearch("");
  });

  els.drawerSearch?.addEventListener("input", () => {
    if (!els.drawerSearch) return;
    if (els.drawerSearch.value.trim() === "") applySearch("");
  });

  els.btnMenu?.addEventListener("click", openDrawer);
  els.btnDrawerClose?.addEventListener("click", closeDrawer);
  els.mobileDrawer?.addEventListener("close", () => {
    document.body.style.overflow = "";
    setMenuExpanded(false);
  });
  els.mobileDrawer?.addEventListener("click", (e) => {
    if (e.target === els.mobileDrawer) closeDrawer();
  });
  els.mobileDrawer?.addEventListener("click", (e) => {
    const a = e.target?.closest?.("a[href^='#']");
    if (a) closeDrawer();
  });

  window.addEventListener("resize", () => {
    if (!isMobileWidth()) closeDrawer();
  });

  tryAutoLocateOnLoad();
}

init();
