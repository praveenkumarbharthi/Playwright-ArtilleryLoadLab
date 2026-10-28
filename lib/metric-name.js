'use strict';

const { BASE_URL } = require('./journey-config');

function rewriteMetricName(metricName, target = process.env.BASE_URL || BASE_URL) {
  const match = String(metricName).match(
    /^(browser\.page\.(?:LCP|FCP|CLS|TTFB|INP|FID))\.(https?:\/\/\S+)$/
  );
  if (match && target) {
    try {
      const source = new URL(match[2]);
      const destination = new URL(target);
      if (source.origin === destination.origin) {
        const path = destination.pathname.endsWith('/')
          ? destination.pathname
          : `${destination.pathname}/`;
        return `${match[1]}.${destination.origin}${path}`;
      }
    } catch (error) {
      throw new Error(`Invalid target URL for metric normalization: ${target}`, {
        cause: error
      });
    }
  }
  return metricName;
}

module.exports = {
  rewriteMetricName
};
