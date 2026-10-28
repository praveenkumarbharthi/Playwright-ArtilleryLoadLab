# UI Performance Summary (Playwright + Artillery)

Overall Quality Gate: **passed**

## Concurrency Summary

- VUs Launched: 30
- Completed VUs: 30
- Failed VUs: 0
- Mean Session Duration: 1781.3 ms
- Baseline Single-User Journey: 4342 ms
- Concurrent Journey p95: 1790.4 ms

## Core Web Vitals

| Vital | min | median | p95 | p99 |
| --- | --- | --- | --- | --- |
| FCP | 504 ms | 550.1 ms | 584.2 ms | 584.2 ms |
| LCP | 636 ms | 713.5 ms | 820.7 ms | 907 ms |
| CLS | 0.000 | 0.000 | 0.000 | 0.000 |
| TTFB | 81.4 ms | 104.6 ms | 159.2 ms | 183.1 ms |
| INP | 40 ms | 40 ms | 47.9 ms | 56.3 ms |

## Step Timings

| Step | Single VU | min | median | p95 | p99 |
| --- | --- | --- | --- | --- | --- |
| goto-login-page | 3464 ms | 681 ms | 757.6 ms | 854.2 ms | 963.1 ms |
| login-to-inventory-ready | 388 ms | 188 ms | 252.2 ms | 347.3 ms | 399.5 ms |
| add-to-cart-to-badge-updated | 98 ms | 38 ms | 80.6 ms | 106.7 ms | 115.6 ms |
| open-cart-to-item-verified | 83 ms | 50 ms | 66 ms | 159.2 ms | 165.7 ms |
| open-checkout-form | 57 ms | 49 ms | 68.7 ms | 175.9 ms | 175.9 ms |
| checkout-form-to-overview | 173 ms | 137 ms | 162.4 ms | 252.2 ms | 257.3 ms |
| checkout-submit-to-confirmation-visible | 79 ms | 53 ms | 82.3 ms | 108.9 ms | 111.1 ms |

## Quality Gate Verdicts

- Largest Contentful Paint (LCP p95) <= 2500 ms: PASS (820.7 ms)
- First Contentful Paint (FCP p95) <= 1800 ms: PASS (584.2 ms)
- Interaction to Next Paint (INP p95) <= 200 ms: PASS (47.9 ms)
- Time To First Byte (TTFB p95) <= 800 ms: PASS (159.2 ms)
- Cumulative Layout Shift (CLS p95) <= 0.100: PASS (0.000)
- Full Journey Duration (p95) <= 8000 ms: PASS (1790.4 ms)
- Virtual User Failure Count <= 0: PASS (0)
