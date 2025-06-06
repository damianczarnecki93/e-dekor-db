const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const ProductList = require('./models/ProductList');
const Inventory = require('./models/Inventory');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const importCSV = async (filePath, model) => {
  const csvFilePath = path.join(__dirname, filePath);
  if (!fs.existsSync(csvFilePath)) {
    console.log(`File not found: ${csvFilePath}. Skipping.`);
    return 0;
  }
  const csvData = fs.readFileSync(csvFilePath, 'utf8');
  let count = 0;

  return new Promise((resolve, reject) => {
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length) {
          console.error('Parsing errors:', results.errors);
          return reject(new Error('CSV parsing error'));
        }
        
        console.log(`Found ${results.data.length} rows in ${filePath}`);
        if (results.data.length > 0) {
          try {
            await model.insertMany(results.data, { ordered: false });
            count = results.data.length;
            console.log(`${count} records successfully imported from ${filePath}.`);
          } catch (err) {
            if (err.writeErrors) {
                console.error(` Encountered ${err.writeErrors.length} errors during insertion from ${filePath}.`);
            } else {
                console.error(`Error inserting data from ${filePath}:`, err);
            }
          }
        }
        resolve(count);
      },
      error: (error) => {
        console.error(`Error parsing ${filePath}:`, error);
        reject(error);
      }
    });
  });
};

const importData = async () => {
  await connectDB();
  try {
    console.log('Clearing existing data...');
    await ProductList.deleteMany({});
    await Inventory.deleteMany({});
    console.log('Data cleared.');

    let totalImported = 0;
    totalImported += await importCSV('public/produkty.csv', ProductList);
    totalImported += await importCSV('public/produkty2.csv', ProductList);
    
    console.log(`Total products imported: ${totalImported}`);

  } catch (err) {
    console.error('An error occurred during the data import process:', err);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

importData();
