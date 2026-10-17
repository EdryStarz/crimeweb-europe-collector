# Europe RSS Collector

Standalone scheduled RSS transport. This repository contains only the collector, not the CrimeWeb application, database, classifier, map, or private source repository.

## Operation

GitHub Actions runs at minute 17 and 47 of every hour, day and night, on standard `ubuntu-latest` runners. It needs no personal computer. The server decides which registered European RSS feeds are due (normally hourly). Jobs do not overlap; each run has a 15-minute limit. Pending feeds resume on the next run. GitHub may delay or drop scheduled runs; this is a best-effort beta service, not an uptime SLA.

The application remains responsible for validation, classification, location uncertainty, privacy, deduplication and persistence. Google News snippets are headlines, not full article text. Reports are not independently verified facts or a crime-rate ranking.

## Protected configuration

- Repository variable `INGESTION_API_URL`: public HTTPS application origin.
- Actions secret `EUROPE_COLLECTOR_SECRET`: a dedicated server-configured European RSS credential. Never commit it, put it in a URL, or print it. It cannot administer the application, enable feeds, force polls, or write other regions.
- No `ADMIN_PASSWORD`, general ingestion credential, Sites service credential or source-repository credential belongs here.

Only scheduled and manually dispatched default-branch runs receive the secret. No pull-request workflow is enabled. Actions are pinned to full commit IDs; checkout does not persist Git credentials. The collection job has read-only repository access. A separate job, which never receives the application secret or installs dependencies, writes one aggregate operational report per month under `status/`. This records genuine ongoing activity and avoids leaving an active collection repository dormant. Reports contain counts and run URLs, never source texts or secrets.

Standard GitHub-hosted runners are free in public repositories: https://docs.github.com/en/billing/concepts/product-billing/github-actions . No paid runners, artifacts, caches or paid APIs are configured. GitHub can still suspend schedules or impose service limits. Inspect the Actions tab and application source-health page after interruptions; manual **Run workflow** is available.

## Local development

Node.js 22+, `npm ci --ignore-scripts`, `npm test`. `npm start` requires the environment values above. Do not enable shell command tracing with credentials. Failed imports make the workflow fail visibly; successful feed jobs are read back from the application before being counted as persisted.
