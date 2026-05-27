# Home Depot API samples

## `homedepot-search-response.json`

Captured from a real **Unwrangle `homedepot_search`** response (user-provided in chat). Use it to validate field mapping and electrical filtering without calling the live API.

To refresh from a new API response, paste the full JSON body into this file (same shape as Unwrangle returns).

## Verify mapper + `14/2` filter

```bash
npm run verify:homedepot-sample
```

Requires Node only (no API key).
