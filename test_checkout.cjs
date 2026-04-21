async function testCheckout() {
  try {
    const res = await fetch('http://localhost:5000/api/orders/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 4,
        truckId: 2,
        paymentMode: "Cash",
        items: [
          {
            productId: 20, // Pepsi 2.25L
            quantity: 1, // 1 case
            customFreeQty: 2 // 2 free bottles!
          }
        ]
      })
    });
    
    if (!res.ok) {
        console.error("HTTP Erorr:", res.status, await res.text());
        return;
    }
    const data = await res.json();
    console.log("Checkout response:", data);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testCheckout();
