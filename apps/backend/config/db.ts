import mongoose from 'mongoose';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/veda-ai';

async function main() {
  await mongoose.connect(MONGO_URL);
}

export default main;