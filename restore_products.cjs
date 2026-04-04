const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite.db');
const db = new Database(dbPath);

const productsToRestore = [
  // IDs 1-8 (250ml/400ml series - assumed names based on category presence)
  { id: 1, name: 'Pepsi 250ml', price: 25, category: 'others', imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e', unit: 'ml', quantityPerUnit: '250', itemsPerCase: 24, purchasePrice: 20, stock: 0 },
  { id: 2, name: '7Up 250ml', price: 25, category: 'others', imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97', unit: 'ml', quantityPerUnit: '250', itemsPerCase: 24, purchasePrice: 20, stock: 0 },
  { id: 3, name: 'Mirinda 250ml', price: 25, category: 'others', imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4c', unit: 'ml', quantityPerUnit: '250', itemsPerCase: 24, purchasePrice: 20, stock: 0 },
  { id: 4, name: 'Mountain Dew 250ml', price: 25, category: 'others', imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e', unit: 'ml', quantityPerUnit: '250', itemsPerCase: 24, purchasePrice: 20, stock: 0 },
  { id: 5, name: 'Pepsi 400ml', price: 40, category: '400_ml', imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e', unit: 'ml', quantityPerUnit: '400', itemsPerCase: 24, purchasePrice: 32, stock: 0 },
  { id: 6, name: '7Up 400ml', price: 40, category: '400_ml', imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97', unit: 'ml', quantityPerUnit: '400', itemsPerCase: 24, purchasePrice: 32, stock: 0 },
  { id: 7, name: 'Mirinda 400ml', price: 40, category: '400_ml', imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e', unit: 'ml', quantityPerUnit: '400', itemsPerCase: 24, purchasePrice: 32, stock: 0 },
  { id: 8, name: 'Mountain Dew 400ml', price: 40, category: '400_ml', imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e', unit: 'ml', quantityPerUnit: '400', itemsPerCase: 24, purchasePrice: 32, stock: 0 },
  
  // IDs 9-19 (Historical Products with verified stock/IDs)
  { id: 9, name: 'Pepsi 1 Ltr', price: 50, category: '1_ltr', imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e', unit: 'ltr', quantityPerUnit: '1', itemsPerCase: 12, purchasePrice: 40, stock: 3 },
  { id: 10, name: 'Pepsi 750ML', price: 60, category: '750_ml', imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e', unit: 'ml', quantityPerUnit: '750', itemsPerCase: 24, purchasePrice: 45, stock: 34 },
  { id: 11, name: '7 Up 2.25L', price: 110, category: '2_25_ltr', imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97', unit: 'ltr', quantityPerUnit: '2.25', itemsPerCase: 6, purchasePrice: 90, stock: 26 },
  { id: 12, name: 'Mirinda 2.25L', price: 110, category: '2_25_ltr', imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97', unit: 'ltr', quantityPerUnit: '2.25', itemsPerCase: 6, purchasePrice: 90, stock: 26 },
  { id: 13, name: 'Mountain Dew 2.25L', price: 110, category: '2_25_ltr', imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e', unit: 'ltr', quantityPerUnit: '2.25', itemsPerCase: 6, purchasePrice: 90, stock: 26 },
  { id: 14, name: 'Soda 2.25L', price: 110, category: '2_25_ltr', imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e', unit: 'ltr', quantityPerUnit: '2.25', itemsPerCase: 6, purchasePrice: 85, stock: 28 },
  { id: 15, name: 'Lehar Soda 750ML', price: 60, category: '750_ml', imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e', unit: 'ml', quantityPerUnit: '750', itemsPerCase: 24, purchasePrice: 45, stock: 102 },
  { id: 16, name: 'Mirinda 750ML', price: 60, category: '750_ml', imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97', unit: 'ml', quantityPerUnit: '750', itemsPerCase: 24, purchasePrice: 45, stock: 27 },
  { id: 17, name: 'Pepsi 2.25L', price: 110, category: '2_25_ltr', imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e', unit: 'ltr', quantityPerUnit: '2.25', itemsPerCase: 6, purchasePrice: 90, stock: 3 },
  { id: 18, name: 'Mountain Dew 750', price: 60, category: '750_ml', imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e', unit: 'ml', quantityPerUnit: '750', itemsPerCase: 24, purchasePrice: 45, stock: 23 },
  { id: 19, name: '7Up 750ML', price: 60, category: '750_ml', imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97', unit: 'ml', quantityPerUnit: '750', itemsPerCase: 24, purchasePrice: 45, stock: 24 },
];

db.transaction(() => {
  const insertProduct = db.prepare('INSERT OR REPLACE INTO products (id, name, price, category, image_url, unit, quantity_per_unit, items_per_case, purchase_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertStock = db.prepare('INSERT OR REPLACE INTO godown_stock (product_id, cases_available) VALUES (?, ?)');

  for (const p of productsToRestore) {
    insertProduct.run(p.id, p.name, p.price, p.category, p.imageUrl, p.unit, p.quantityPerUnit, p.items_per_case || 1, p.purchasePrice);
    insertStock.run(p.id, p.stock);
    console.log("Restored: " + p.name + " (ID: " + p.id + ", Stock: " + p.stock + ")");
  }
})();

console.log('Restoration complete.');
db.close();
