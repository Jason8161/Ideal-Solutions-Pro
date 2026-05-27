import {
  extractLengthFromQuery,
  normalizeMaterialsSearchInput,
} from "../dist/pricing/materialsSearchQuery.js";

const queries = [
  "1000' spool 14/2 romex",
  "1000 ft 14/2 romex",
  "1000ft 14/2 romex",
  "1000 foot 14/2 romex",
  "1000 ft spool of 14/2 romex",
  "1000' of 14/2 romex",
];

for (const q of queries) {
  const ext = extractLengthFromQuery(q);
  const norm = normalizeMaterialsSearchInput(q, { qty: 1 });
  console.log(JSON.stringify({ q, ext, catalogQuery: norm.catalogQuery, length: norm.length }));
}
