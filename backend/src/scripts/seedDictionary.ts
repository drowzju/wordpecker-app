import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file in the backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import fs from 'fs';
import { connectDB } from '../config/mongodb';

// Define a schema for the dictionary entries
const dictionarySchema = new mongoose.Schema({
  word: { type: String, required: true, index: true, unique: true },
  entries: mongoose.Schema.Types.Mixed // Store the definitions object
});

const Dictionary = mongoose.model('Dictionary', dictionarySchema);

const seedDictionary = async () => {
  try {
    console.log('🌱 Starting dictionary seeding...');

    console.log('📡 Connecting to database...');
    await connectDB();
    console.log('✓ Database connected successfully\n');

    const filePath = path.join(__dirname, '../../data/dictionary.json');
    console.log(`📂 Loading dictionary from ${filePath}...`);
    const dictionaryData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const words = Object.keys(dictionaryData);
    console.log(`Found ${words.length} words to seed.\n`);

    // Clear existing data
    console.log('🗑️  Clearing existing dictionary data...');
    const deleteResult = await Dictionary.deleteMany({});
    console.log(`✓ Cleared ${deleteResult.deletedCount} existing entries.\n`);

    console.log('📝 Inserting new dictionary entries...');
    const batchSize = 1000;
    let seededCount = 0;
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      const operations = batch.map(word => ({
        insertOne: {
          document: {
            word: word.toLowerCase(),
            entries: dictionaryData[word]
          }
        }
      }));

      const result = await Dictionary.bulkWrite(operations);
      seededCount += result.insertedCount;
      console.log(`Processed batch ${i / batchSize + 1} of ${Math.ceil(words.length / batchSize)}, inserted: ${result.insertedCount}`);
    }

    console.log(`\n✅ Successfully inserted ${seededCount} dictionary entries.`);
    console.log('\n🎉 Dictionary seeding completed successfully!');

  } catch (error) {
    console.error('\n❌ Error seeding dictionary:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed.');
    process.exit(0);
  }
};

// Run if called directly
if (require.main === module) {
  seedDictionary();
}
