# Europe RSS Collector

Standalone scheduled RSS transport. This repository contains only the collector, not the CrimeWeb application, database, classifier, map, or private source repository.

## Operation

GitHub Actions runs at minute 17 and 47 of every hour, day and night, on standard `ubuntu-latest` runners. It needs no personal computer. The server decides which registered European RSS feeds are due (normally hourly). Jobs do not overlap; each run has a 15-minute limit. Pending feeds resume on the next run. GitHub may delay or drop scheduled runs; this is a best-effort beta service, not an uptime SLA.

The application remains responsible for validation, classification, location uncertainty, privacy, deduplication and persistence. Google News snippets are headlines, not full article text. Reports are not independently verified facts or a crime-rate ranking.

The runner also transports public article HTML for short-lived, server-selected European archive jobs (up to 50 steps per run). For Google News, it fetches bounded public navigation evidence for an issued link and sends it to the private server for validation and publisher authorization **before** any publisher GET. It never guesses originals from similar headlines. It obeys publisher robots.txt, checks every redirect against server-issued hosts, validates and pins public IPv4 DNS addresses, limits HTML to 1 MB, and never sends the application credential to Google or a publisher. Certificate verification remains enabled. Private, metadata and reserved networks are rejected, including after DNS changes. HTML is sent only to the private application for extraction and storage; no articles, source texts or app algorithms are printed, committed or retained in this repository. Paywalls, login, CAPTCHA and access/rate-limit denials are not bypassed. Aggregate `articles` / `article-states` logs distinguish resolved Google URLs, saved bodies and explicit unavailability; a resolved link alone is not a successful full-text download or a street pin. Existing dates and identifiers are preserved by the server.

After feed collection, the runner performs up to 80 resumable server-maintenance steps within the same time budget. The server alone selects eligible European reports and stores source-backed street/district coordinates. This repository contains only the authenticated transport, not the geolocation implementation, map data, or application code. Maintenance accepts no submitted coordinates or arbitrary URLs. Failed lookups keep approximate locations; incomplete work resumes on later runs without a personal computer or map zooming.

For historical backfill, **Run workflow → maintenance_only** skips RSS and feed writes, but runs the same restricted server maintenance. It cannot force a deferred lookup, broaden the region, add sources or submit coordinates. Normal runs reserve three minutes for enrichment. Deferred records are counted separately and do not stop unrelated work; unfinished/backoff work continues on later runs. A maintenance-only run does not publish a monthly news-collection report.

Manual **Run workflow** accepts an optional `source_prefix` to probe a group of newly registered feeds (for example `local-`). This only filters the server-provided due registry; it cannot add feeds or force polling. Leave it empty for the full European queue. Scheduled runs always use the full queue. The equivalent local variable is `SOURCE_ID_PREFIX`.

## Protected configuration

- Repository variable `INGESTION_API_URL`: public HTTPS application origin.
- Actions secret `EUROPE_COLLECTOR_SECRET`: a dedicated server-configured European RSS credential. Never commit it, put it in a URL, or print it. It cannot administer the application, enable feeds, force polls, or write other regions.
- No `ADMIN_PASSWORD`, general ingestion credential, Sites service credential or source-repository credential belongs here.

Only scheduled and manually dispatched default-branch runs receive the secret. No pull-request workflow is enabled. Actions are pinned to full commit IDs; checkout does not persist Git credentials. The collection job has read-only repository access. A separate job, which never receives the application secret or installs dependencies, writes one aggregate operational report per month under `status/`. This records genuine ongoing activity and avoids leaving an active collection repository dormant. Reports contain counts and run URLs, never source texts or secrets.

Standard GitHub-hosted runners are free in public repositories: https://docs.github.com/en/billing/concepts/product-billing/github-actions . No paid runners, artifacts, caches or paid APIs are configured. GitHub can still suspend schedules or impose service limits. Inspect the Actions tab and application source-health page after interruptions; manual **Run workflow** is available.

## Local development

Node.js 22+, `npm ci --ignore-scripts`, `npm test`. `npm start` requires the environment values above. Do not enable shell command tracing with credentials. Failed imports make the workflow fail visibly; successful feed jobs are read back from the application before being counted as persisted.

RSS timeouts, connection failures, HTTP 429 and transient server errors receive up to two bounded retries. Access denials, unsafe URLs and malformed feeds are never bypassed. The optional **Probe public RSS access** workflow tests up to five public RSS URLs from the GitHub runner without receiving any application secret or writing to the application.
