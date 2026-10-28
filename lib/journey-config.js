'use strict';

const BASE_URL = process.env.BASE_URL || 'https://www.saucedemo.com';
const USERNAME = process.env.SAUCE_USERNAME || 'standard_user';
const PASSWORD = process.env.SAUCE_PASSWORD || 'secret_sauce';

function thresholdFromEnv(name, fallback, legacyName) {
  const raw = process.env[name] === undefined && legacyName
    ? process.env[legacyName]
    : process.env[name];
  const value = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite number greater than or equal to 0`);
  }
  return value;
}

const THRESHOLDS = {
  LCP_P95_MS: thresholdFromEnv('LCP_P95_MS', 2500),
  CLS_P95: thresholdFromEnv('CLS_P95', 0.1),
  JOURNEY_P95_MS: thresholdFromEnv('JOURNEY_P95_MS', 8000),
  FCP_P95_MS: thresholdFromEnv('FCP_P95_MS', 1800, 'FCP_MS'),
  INP_P95_MS: thresholdFromEnv('INP_P95_MS', 200, 'INP_MS'),
  TTFB_P95_MS: thresholdFromEnv('TTFB_P95_MS', 800, 'TTFB_MS')
};

const CHECKOUT = {
  firstName: process.env.CHECKOUT_FIRST_NAME || 'Jane',
  lastName: process.env.CHECKOUT_LAST_NAME || 'Doe',
  postalCode: process.env.CHECKOUT_POSTAL_CODE || '94043'
};

const PRODUCT = {
  id: 'sauce-labs-backpack',
  name: 'Sauce Labs Backpack'
};

const SELECTORS = {
  username: '[data-test="username"]',
  password: '[data-test="password"]',
  loginButton: '[data-test="login-button"]',
  inventoryList: '.inventory_list',
  addBackpack: '[data-test="add-to-cart-sauce-labs-backpack"]',
  cartBadge: '[data-test="shopping-cart-badge"]',
  cartLink: '[data-test="shopping-cart-link"]',
  cartItem: '.cart_item',
  itemName: '[data-test="inventory-item-name"]',
  checkout: '[data-test="checkout"]',
  firstName: '[data-test="firstName"]',
  lastName: '[data-test="lastName"]',
  postalCode: '[data-test="postalCode"]',
  continue: '[data-test="continue"]',
  itemPrice: '[data-test="inventory-item-price"]',
  subtotal: '[data-test="subtotal-label"]',
  finish: '[data-test="finish"]',
  completeHeader: '[data-test="complete-header"]'
};

const STEPS = [
  'goto-login-page',
  'login-to-inventory-ready',
  'add-to-cart-to-badge-updated',
  'open-cart-to-item-verified',
  'open-checkout-form',
  'checkout-form-to-overview',
  'checkout-submit-to-confirmation-visible'
];

module.exports = {
  BASE_URL,
  USERNAME,
  PASSWORD,
  THRESHOLDS,
  CHECKOUT,
  PRODUCT,
  SELECTORS,
  STEPS
};
