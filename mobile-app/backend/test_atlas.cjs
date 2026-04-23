const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
console.log('Testing connection to:', uri.split('@')[1]); // Log part of URI for safety

mongoose.connect(uri)
  .then(() => {
    console.log('✅ SUCCESS: Connected to Cluster0!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ ERROR: Could not connect to Cluster0:', err.message);
    process.exit(1);
  });
