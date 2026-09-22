'use strict';

const { runPaymobProviderControlBootstrap } = require('../dist/modules/payment-gateway-control/bootstrap/paymob-provider-control-bootstrap.operator.js');

runPaymobProviderControlBootstrap().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Paymob control bootstrap failed.');
  process.exitCode = 1;
});
