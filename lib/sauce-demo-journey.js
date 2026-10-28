'use strict';

const {
  BASE_URL,
  USERNAME,
  PASSWORD,
  CHECKOUT,
  PRODUCT,
  SELECTORS,
  STEPS
} = require('./journey-config');

async function runSauceDemoPurchaseFlow(page, options = {}) {
  const expect = options.expect;
  const step = options.step;
  const username = options.username || USERNAME;
  const password = options.password || PASSWORD;
  const baseUrl = options.baseUrl || BASE_URL;
  const timings = {};
  const journeyStartedAt = Date.now();

  if (typeof step !== 'function') {
    throw new Error('runSauceDemoPurchaseFlow requires a test.step function');
  }
  if (!expect) {
    throw new Error('runSauceDemoPurchaseFlow requires Playwright expect');
  }

  async function timedStep(name, fn) {
    const startedAt = Date.now();
    await step(name, fn);
    timings[name] = Date.now() - startedAt;
  }

  await timedStep('goto-login-page', async () => {
    await page.goto(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`, {
      waitUntil: 'load'
    });
    await expect(page.locator(SELECTORS.loginButton)).toBeVisible();
    await expect(page.locator(SELECTORS.username)).toBeVisible();
    if (typeof options.onInitialPageReady === 'function') {
      await options.onInitialPageReady(page);
    }
  });

  await timedStep('login-to-inventory-ready', async () => {
    await page.locator(SELECTORS.username).fill(username);
    await page.locator(SELECTORS.password).fill(password);
    await page.locator(SELECTORS.loginButton).click();
    await expect(page.locator(SELECTORS.inventoryList)).toBeVisible();
    await expect(page).toHaveURL(/inventory/);
  });

  await timedStep('add-to-cart-to-badge-updated', async () => {
    await page.locator(SELECTORS.addBackpack).click();
    await expect(page.locator(SELECTORS.cartBadge)).toHaveText('1');
  });

  await timedStep('open-cart-to-item-verified', async () => {
    await page.locator(SELECTORS.cartLink).click();
    await expect(page.locator(SELECTORS.cartItem)).toHaveCount(1);
    await expect(page.locator(SELECTORS.itemName)).toHaveText(PRODUCT.name);
  });

  await timedStep('open-checkout-form', async () => {
    await page.locator(SELECTORS.checkout).click();
    await expect(page.locator(SELECTORS.firstName)).toBeVisible();
    await expect(page.locator(SELECTORS.continue)).toBeVisible();
  });

  await timedStep('checkout-form-to-overview', async () => {
    await page.locator(SELECTORS.firstName).fill(CHECKOUT.firstName);
    await page.locator(SELECTORS.lastName).fill(CHECKOUT.lastName);
    await page.locator(SELECTORS.postalCode).fill(CHECKOUT.postalCode);
    await page.locator(SELECTORS.continue).click();
    await expect(page.locator(SELECTORS.subtotal)).toBeVisible();
    await expect(page.locator(SELECTORS.itemPrice).first()).toBeVisible();
    const itemPrice = (await page.locator(SELECTORS.itemPrice).first().innerText()).trim();
    const subtotal = (await page.locator(SELECTORS.subtotal).innerText()).trim();
    expect(itemPrice).toMatch(/\$\d+\.\d{2}/);
    expect(subtotal).toContain(itemPrice);
  });

  await timedStep('checkout-submit-to-confirmation-visible', async () => {
    await page.locator(SELECTORS.finish).click();
    await expect(page.locator(SELECTORS.completeHeader)).toBeVisible();
    await expect(page.locator(SELECTORS.completeHeader)).toHaveText(
      /thank you for your order/i
    );
  });

  return {
    timings,
    steps: STEPS,
    totalMs: Date.now() - journeyStartedAt
  };
}

module.exports = {
  runSauceDemoPurchaseFlow
};
