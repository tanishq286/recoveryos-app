# Pan-India drop folder

Put files here and run `npm run ingest:pan-india -w @recoveryos/db` (add `-- --watch` to keep
watching). Recognised by their header row:

- IEPF-2 / IEPF-4 / registrar unclaimed-dividend statements (.xlsx, .xls, .csv, .pdf). Name the
  file `<CIN or ISIN or company-slug>__anything.ext` when the rows carry no CIN, ISIN or company
  name of their own.
- BSE's "List of Scrips" export and NSE's equity lists (EQUITY_L.csv, SME_EQUITY_L.csv), for the
  calculator's equity directory.

Download each file yourself from its source. Loaded files move to `processed/`, rejected ones
to `failed/`, each with a `.result.json`. Everything in this folder except this README is
ignored by git.
