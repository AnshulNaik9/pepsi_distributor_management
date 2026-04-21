const fetch = require('node-fetch');

async function testCheckout() {
  const orderData = {
    customerId: "69e599e7d881ff2fc97b35d4",
    truckId: "69e70c07ff0c8cac9719bd58",
    paymentMode: "Cash",
    items: [
      {
        productId: "69e599e7d881ff2fc97b35ab",
        quantity: 1
      }
    ]
  };

  try {
    const res = await fetch('http://localhost:8082/api/orders/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    const json = await res.json();
    console.log('Checkout Response:', JSON.stringify(json, null, 2));
    
    if (json.orderNumber) {
      console.log('SUCCESS: Order number is', json.orderNumber);
    } else {
      console.log('FAILURE: No orderNumber in response');
    }
  } catch (e) {
    console.error('Error during test:', e.message);
  }
}

testCheckout();
