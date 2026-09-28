Myanmar Admin Explorer - web package
=====================================
Upload this whole folder (index.html, lib.js, css/, fonts/, js/, data/) to any static web host:
GitHub Pages, Netlify, or your own web server. No database or server code needed.

IMPORTANT: it must be opened through a web address (http/https).
Double-clicking index.html on your computer will NOT load the data - use the
offline file Myanmar_Admin_Explorer.html for that.

Embed in another page:
  <iframe src="https://YOUR-SITE/myanmar-map/index.html" width="100%" height="700"
          style="border:0" allowfullscreen></iframe>

Deep links: index.html#MMR013 (area by P-code), #BT29 (border point),
            #MU320 (military unit), #TC042 (town control), #@16.8053,96.1561 (coordinate)

Test locally before uploading (needs Python):  python -m http.server 8000
then open http://localhost:8000 in the browser.

Contents
  index.html               page layout (header, sidebar, Layers panel, pop-ups)
  lib.js                   map libraries (Leaflet, TopoJSON)
  css/leaflet.css          Leaflet map styles
  css/app.css              app theme (light + dark HUD), loads fonts/
  fonts/*.woff2            Rajdhani, IBM Plex Sans, JetBrains Mono
  js/00-core.js ... 11-coordinates.js
                           app code, one file per part; loaded in number order (order matters):
                           00 core/data loading · 01 search · 02 map · 03 views · 04 Layers panel UI
                           05 sidebar · 06 border points · 07 military units · 08 town control
                           09 reference layers · 10 basemaps · 11 coordinate lookup
  data/core.json           names, P-codes, villages, state/district/township boundaries
  data/st_<PCODE>.json     village-tract + ward boundaries per state (loaded on demand)
  data/layer_border.json   Border Trade Towns & Ports 2026
  data/layer_units.json    Military Units (IB/LIB) 2024  - SENSITIVE: public to anyone with the link.
                           Delete this file to hide the layer on the website.
  data/ref_*.json          Reference layers (MIMU): ref_road, ref_rail, ref_river, ref_saz,
                           ref_airport, ref_seaport. Each loads only when switched on.
                           Rebuild from the shapefiles:  sh build_ref_layers.sh   (in D:\MIMU)
  data/layer_towns.json   Town Control / Capture 2021-2026 - SENSITIVE, same as above.
                           Rebuild after editing the sheet: export it as
                           "D:\MIMU\Town Control_Capture - Towns.csv", then run
                           node build_layer_towns.js   (in D:\MIMU)

Basemap API keys: users can enter their own in the gear (settings) panel. To preset a key for
all visitors, edit BASEMAP_DEFAULT_KEYS in js/10-basemaps.js and restrict the key to your domain.
