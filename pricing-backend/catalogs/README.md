# Store catalogs (weekly CSV drops)

Each **supplier** in the CSV is one store catalog (Home Depot, Lowe's, Graybar, Rexel, Grainger, etc.). The pricing API loads these files into PostgreSQL; the mobile app searches that database — it does not live-scrape most retailers.

## Folder layout

Place one CSV per store (recommended) or use a single master file via `PRICING_CSV_PATH`:

```
catalogs/
  homedepot.csv
  lowes.csv
  graybar.csv
  rexel.csv
  cityelectric.csv
  grainger.csv
```

## CSV columns

Required header (same as `sample-products.csv`):

```csv
supplier,sku,name,description,image_url,category,price,unit,availability
```

- **supplier** — store key, lowercase slug (`homedepot`, `lowes`, `graybar`, …). Must match how the mobile app labels vendors.
- **sku**, **name**, **price** — required per row.

When using one file per store, you can repeat the same `supplier` value in every row or derive it from the filename; the importer normalizes `supplier` to lowercase.

## Weekly update workflow

1. Obtain updated price files from your supplier (export, B2B portal, distributor feed, etc.). Official retailer APIs are usually partner-only; this project uses CSV/DB as the source of truth.
2. Drop updated CSVs into `catalogs/`.
3. Run `npm run import:catalogs` (manual) or enable `ENABLE_CRON=true` on the API for automatic import **every Sunday at 3:00 AM** server local time.
4. Check `GET /catalog/status` for last run time and row counts per supplier.

## Optional live Lowe's search

`UNWRANGLE_API_KEY` enables optional live Lowe's search via Unwrangle (third-party, not Lowe's official API). Catalog CSVs remain the source of truth for scheduled refreshes.

## Optional live Home Depot search

`HOMEDEPOT_API_KEY` (or `UNWRANGLE_API_KEY`) plus optional `HOMEDEPOT_STORE_NO` and `HOMEDEPOT_ZIPCODE` enable live `homedepot_search` via Unwrangle. Live results replace cached `homedepot` CSV rows in `/search`. Electrical queries (e.g. `14/2`) are filtered to Romex, NM-B, MC, UF, and similar building wire.

See `env.example` and `samples/homedepot-search-response.json` for the response shape.

## City Electric Supply (catalog only)

There is no Unwrangle `city_electric_search` platform. Add `cityelectric.csv` with `supplier` slug `cityelectric` (or `City Electric`); the API labels rows **City Electric** for the mobile vendor list. Live API support can be wired later without changing the orchestrator contract.
