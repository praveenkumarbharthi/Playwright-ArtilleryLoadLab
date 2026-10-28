# UI Performance Summary (Playwright + Artillery)

Overall Quality Gate: **passed**

## Concurrency Summary

- VUs Launched: 30
- Completed VUs: 30
- Failed VUs: 0
- Mean Session Duration: 1424.8 ms
- Baseline Single-User Journey: 1286 ms
- Concurrent Journey p95: 1408.4 ms

## Core Web Vitals

| Vital | min | median | p95 | p99 |
| --- | --- | --- | --- | --- |
| FCP | 356 ms | 399.5 ms | 459.5 ms | 459.5 ms |
| LCP | 460 ms | 518.1 ms | 572.6 ms | 620.3 ms |
| CLS | 0.000 | 0.000 | 0.000 | 0.000 |
| TTFB | 83.6 ms | 125.2 ms | 186.8 ms | 190.6 ms |
| INP | 8 ms | 16 ms | 40 ms | 40 ms |

## Step Timings

| Step | Single VU | min | median | p95 | p99 |
| --- | --- | --- | --- | --- | --- |
| goto-login-page | 430 ms | 480 ms | 539.2 ms | 620.3 ms | 645.6 ms |
| login-to-inventory-ready | 171 ms | 141 ms | 179.5 ms | 198.4 ms | 206.5 ms |
| add-to-cart-to-badge-updated | 43 ms | 15 ms | 25.8 ms | 46.1 ms | 46.1 ms |
| open-cart-to-item-verified | 160 ms | 136 ms | 141.2 ms | 162.4 ms | 165.7 ms |
| open-checkout-form | 155 ms | 118 ms | 138.4 ms | 141.2 ms | 141.2 ms |
| checkout-form-to-overview | 178 ms | 80 ms | 175.9 ms | 190.6 ms | 190.6 ms |
| checkout-submit-to-confirmation-visible | 149 ms | 120 ms | 135.7 ms | 144 ms | 144 ms |

## Quality Gate Verdicts

- Largest Contentful Paint (LCP p95) <= 2500 ms: PASS (572.6 ms)
- First Contentful Paint (FCP p95) <= 1800 ms: PASS (459.5 ms)
- Interaction to Next Paint (INP p95) <= 200 ms: PASS (40 ms)
- Time To First Byte (TTFB p95) <= 800 ms: PASS (186.8 ms)
- Cumulative Layout Shift (CLS p95) <= 0.100: PASS (0.000)
- Full Journey Duration (p95) <= 8000 ms: PASS (1408.4 ms)
- Virtual User Failure Count <= 0: PASS (0)
