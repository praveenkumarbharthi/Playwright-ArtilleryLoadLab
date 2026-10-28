# Playwright and Artillery UI Performance Tests

This project runs a SauceDemo purchase flow in Playwright and under concurrent Artillery virtual users. The browser tests use Chromium; they don't currently cover multiple browser engines. Each run writes its reports to a new timestamped folder under `reports/runs/`.

## How it works

The Playwright baseline runs the purchase journey once. It gives you a reference duration and a pass/fail result, but one observation isn't a percentile or a reliable SLA measurement.

Artillery starts virtual users that each launch headless Chromium and run the same journey. The test records Core Web Vitals during these concurrent sessions. LCP is read from the browser's largest-contentful-paint entries before the first interaction; FCP, CLS, TTFB, and INP come from the Playwright engine's web-vitals hooks. These measurements describe the initial page, not every page in checkout.

The dashboard combines the Playwright result with Artillery's final counters, aggregate metrics, journey timings, and quality-gate results. It also writes a Markdown summary. A metric without samples appears as `n/a` and fails its gate; reports don't replace missing data with zero.

## Setup

Install the project dependencies and Chromium:

```bash
npm install
npx playwright install chromium
```

SauceDemo is the default target. The project doesn't load `.env` automatically. Set environment variables in your shell or CI environment if you need to change the target, credentials, or thresholds. `.env.example` is a reference only.

PowerShell example:

```powershell
$env:BASE_URL = "https://www.saucedemo.com"
$env:SAUCE_USERNAME = "standard_user"
$env:SAUCE_PASSWORD = "secret_sauce"
$env:LCP_P95_MS = "2500"
$env:FCP_P95_MS = "1800"
$env:INP_P95_MS = "200"
$env:TTFB_P95_MS = "800"
$env:CLS_P95 = "0.10"
$env:JOURNEY_P95_MS = "8000"
```

## Run tests

Run the single-user Playwright baseline:

```bash
npm test
```

Run a short Artillery smoke test with 2 virtual users over 10 seconds:

```bash
npm run artillery:smoke
```

Run a small concurrency check with an arrival rate of 1 user per second, capped at 3 active virtual users:

```bash
npm run artillery:load
```

This profile is useful for checking the flow under light concurrency. It isn't intended for capacity planning or dependable tail-latency estimates.

Run a larger browser sample with an arrival rate of 2 users per second for 120 seconds, capped at 20 active virtual users:

```bash
npm run artillery:performance
```

Use this only against a system where the traffic is authorized and acceptable. More samples make percentile trends more useful, but p99 still needs a much larger sample to become stable.

Run the report-generator unit tests:

```bash
npm run test:unit
```

Run the full pipeline:

```bash
npm run all
```

This runs the report-generator tests, the Playwright baseline, and the Artillery load profile in one new timestamped folder.

You can also build the dashboard for the newest run folder that contains an Artillery report:

```bash
npm run report
```

Artillery commands build the dashboard and summary automatically. Direct `npx playwright test` runs also use timestamped folders; `npm test` applies the project's wrapper behavior.

## Reports

Each run gets its own directory, for example:

```text
reports/runs/2026-10-27_21-11-35-415/
```

Artillery commands run the Playwright baseline first. A completed run folder therefore contains the Playwright HTML report, JSON results, baseline timings, Artillery raw report, dashboard, and Markdown summary. If two runs start in the same millisecond, the later folder gets a numeric suffix. Existing run folders aren't overwritten or removed.

## Quality gates

| Metric | Default limit |
| --- | ---: |
| LCP p95 | `<= 2500 ms` |
| FCP p95 | `<= 1800 ms` |
| INP p95 | `<= 200 ms` |
| TTFB p95 | `<= 800 ms` |
| CLS p95 | `<= 0.10` |
| Purchase journey duration p95 | `<= 8000 ms` |
| Virtual-user failures | `0` |

Every required metric must have samples. The report command exits with a non-zero status if a gate fails or a required metric is missing. Override the defaults with `LCP_P95_MS`, `FCP_P95_MS`, `INP_P95_MS`, `TTFB_P95_MS`, `CLS_P95`, and `JOURNEY_P95_MS`. Invalid or negative threshold values are rejected.

The report matches browser vital names to the configured target URL, so changing `BASE_URL` is supported. The same journey and gates apply to custom targets.

These are real-browser tests, so each virtual user consumes considerably more CPU and memory than a protocol-level user. Keep browser concurrency within the machine's limits. For high backend request volume or capacity testing, use a separate protocol-level test rather than raising the browser user count without limit.

## Journey timings

The purchase journey records each checkpoint with Playwright `test.step`:

1. `goto-login-page`
2. `login-to-inventory-ready`
3. `add-to-cart-to-badge-updated`
4. `open-cart-to-item-verified`
5. `open-checkout-form`
6. `checkout-form-to-overview` (checks the subtotal and item price)
7. `checkout-submit-to-confirmation-visible` (checks that the order is complete)
