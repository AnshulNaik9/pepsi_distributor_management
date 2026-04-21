const { Product, GodownStock, Route, Customer, Truck, Offer } = require('./models');

async function seed() {
  console.log('Seeding database...');

  // Products
  const p1 = await Product.create({ name: 'Pepsi 2.25L', price: 100, imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e', category: '2_25_ltr', itemsPerCase: 9 });
  const p2 = await Product.create({ name: '7UP 2.25L', price: 95, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97', category: '2_25_ltr', itemsPerCase: 9 });
  const p3 = await Product.create({ name: 'Aquafina 1L', price: 20, imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4c', category: '1_ltr', itemsPerCase: 12 });
  const p4 = await Product.create({ name: 'Miranda 750ml', price: 40, imageUrl: 'https://images.unsplash.com/photo-1625772290748-390911df2d7c', category: '750_ml', itemsPerCase: 24 });

  // Godown Stock
  await GodownStock.create({ productId: p1._id, casesAvailable: 120 });
  await GodownStock.create({ productId: p2._id, casesAvailable: 80 });
  await GodownStock.create({ productId: p3._id, casesAvailable: 250 });
  await GodownStock.create({ productId: p4._id, casesAvailable: 100 });

  // Routes
  const r1 = await Route.create({ name: 'Route A - North City' });
  const r2 = await Route.create({ name: 'Route B - South Market' });

  // Customers
  await Customer.create({ name: 'Sai Stores', phone: '9876543210', routeId: r1._id, address: '12 Main Street', creditBalance: 0, hasSpecialDiscount: true });
  await Customer.create({ name: 'Ganesh Traders', phone: '8765432109', routeId: r1._id, address: '45 Market Road', creditBalance: 1500 });
  await Customer.create({ name: 'Krishna Bakery', phone: '7654321098', routeId: r2._id, address: '88 Bakery Lane', creditBalance: 0 });

  // Truck
  await Truck.create({ vehicleNumber: 'KA19 AB 1234', driverName: 'Ramesh' });

  // Offers
  const promoProducts = [p1, p2, p4].filter(p => {
    const name = p.name.toLowerCase();
    const isPromoSize = name.includes('2.25') || name.includes('750') || p.category === '2_25_ltr' || p.category === '750_ml';
    const isExcluded = (name.includes('soda') && name.includes('2.25')) || (name.includes('lehar') && name.includes('soda') && name.includes('750'));
    return isPromoSize && !isExcluded;
  });

  for (const buyProd of promoProducts) {
    await Offer.create({
      name: `Buy 1 ${buyProd.name} Get 2 Aquafina Free`,
      buyProductId: buyProd._id,
      buyQuantity: 1,
      freeProductId: p3._id,
      freeQuantity: 2,
      isActive: true
    });
  }

  console.log('✅ Seed data created successfully');
}

module.exports = seed;
