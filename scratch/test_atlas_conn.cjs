const mongoose = require('mongoose');

const uri = 'mongodb+srv://naikanshu9_db_user:Karwar%40123@cluster0.4axkjzl.mongodb.net/?appName=Cluster0';

console.log('Connecting to MongoDB Atlas...');

mongoose.connect(uri)
  .then(() => {
    console.log('✅ SUCCESS: Connected to MongoDB Atlas Cluster0');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ FAILURE: Could not connect to MongoDB Atlas');
    console.error(err.message);
    process.exit(1);
  });
