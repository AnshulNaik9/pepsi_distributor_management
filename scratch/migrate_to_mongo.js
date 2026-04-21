import fetch from 'node-fetch';
import { MongoClient } from 'mongodb';

const BASE_URL = 'http://localhost:5000/api';
const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'distrisys';

const collections = [
  'products',
  'godown-stock',
  'trucks',
  'routes',
  'customers',
  'offers',
  'orders',
  'expenses'
];

async function migrate() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Connected to database: ${DB_NAME}`);

    for (const collectionName of collections) {
      console.log(`\nMigrating ${collectionName}...`);
      
      const response = await fetch(`${BASE_URL}/${collectionName}`);
      if (!response.ok) {
        console.error(`Failed to fetch ${collectionName}: ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`No records found for ${collectionName}.`);
        continue;
      }

      const collection = db.collection(collectionName.replace('-', '_'));
      
      // Clear existing records in the collection before inserting new ones
      await collection.deleteMany({});
      
      const result = await collection.insertMany(data);
      console.log(`Successfully migrated ${result.insertedCount} records to ${collectionName}.`);
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

migrate();
