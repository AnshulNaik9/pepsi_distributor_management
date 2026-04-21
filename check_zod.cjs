const { register } = require('esbuild-register/dist/node');
register();
const { checkoutSchema } = require('./shared/schema.ts');

const payload = {
  customerId: 48,
  truckId: 2,
  paymentMode: 'Cash',
  items: [{ productId: 11, quantity: 2 }],
};

console.log("Input:", JSON.stringify(payload));
const parsed = checkoutSchema.parse(payload);
console.log("Parsed:", JSON.stringify(parsed));
