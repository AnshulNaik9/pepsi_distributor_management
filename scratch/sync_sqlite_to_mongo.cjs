const http = require('http');

const SQLITE_BASE = 'http://localhost:5000/api';
const MONGO_BASE = 'http://localhost:5050/api';

async function request(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : null);
        } else {
          // console.error(`Failed ${method} ${url}: ${res.statusCode} ${data}`);
          reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const routeMap = {};
const productMap = {};

async function sync() {
  try {
    // 1. Routes
    console.log('Syncing routes...');
    const routes = await request(`${SQLITE_BASE}/routes`);
    for (const r of routes) {
      const { id, ...data } = r;
      try {
        const mongoRoute = await request(`${MONGO_BASE}/routes`, 'POST', data);
        routeMap[id] = mongoRoute._id;
      } catch (e) {
        // Find existing if duplicate (assuming name is unique enough or we just trust the sync)
        const existing = await request(`${MONGO_BASE}/routes`);
        const found = existing.find(er => er.name === r.name);
        if (found) routeMap[id] = found._id;
      }
    }
    console.log('Routes mapped.');

    // 2. Products
    console.log('Syncing products...');
    const products = await request(`${SQLITE_BASE}/products`);
    for (const p of products) {
      const { id, ...data } = p;
      try {
        const mongoProd = await request(`${MONGO_BASE}/products`, 'POST', data);
        productMap[id] = mongoProd._id;
      } catch (e) {
        const existing = await request(`${MONGO_BASE}/products`);
        const found = existing.find(ep => ep.name === p.name);
        if (found) productMap[id] = found._id;
      }
    }
    console.log('Products mapped.');

    // 3. Customers
    console.log('Syncing customers...');
    const customers = await request(`${SQLITE_BASE}/customers`);
    let cSuccess = 0;
    for (const c of customers) {
      const { id, ...data } = c;
      if (routeMap[data.routeId]) {
        data.routeId = routeMap[data.routeId];
      } else {
        // Fallback to first route or something if mapping fails
        const firstRoute = Object.values(routeMap)[0];
        if (firstRoute) data.routeId = firstRoute;
      }
      try {
        await request(`${MONGO_BASE}/customers`, 'POST', data);
        cSuccess++;
      } catch (e) {
        // console.error(`Customer failed: ${e.message}`);
      }
    }
    console.log(`Synced ${cSuccess}/${customers.length} customers.`);

    // 4. Offers
    console.log('Syncing offers...');
    const offers = await request(`${SQLITE_BASE}/offers`);
    let oSuccess = 0;
    for (const o of offers) {
      const { id, ...data } = o;
      data.buyProductId = productMap[data.buyProductId];
      data.freeProductId = productMap[data.freeProductId];
      
      if (data.buyProductId && data.freeProductId) {
        try {
          await request(`${MONGO_BASE}/offers`, 'POST', data);
          oSuccess++;
        } catch (e) {
          // console.error(`Offer failed: ${e.message}`);
        }
      }
    }
    console.log(`Synced ${oSuccess}/${offers.length} offers.`);

    console.log('Sync Complete!');
  } catch (e) {
    console.error(`Sync aborted: ${e.message}`);
  }
}

sync();
