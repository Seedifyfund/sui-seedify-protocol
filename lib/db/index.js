
import mongoose from 'mongoose';
// let username = 'vestinguser'
// ewcyhwttzKfVgwWd
const dbUrl = "mongodb+srv://adilrana03:Adilrana03@cluster1.u50gzns.mongodb.net/?retryWrites=true&w=majority&appName=artfi"
// const dbUrl = "mongodb+srv://vestinguser:ewcyhwttzKfVgwWd@vesting.5wykj.mongodb.net/?retryWrites=true&w=majority&appName=artfi"

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // Usi existing database connection if already connected
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.conn && cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  // Connect to the database
  try {
    cached.promise = mongoose.connect(dbUrl);
    cached.conn = await cached.promise;
    console.log('Database connected...');
    return cached.conn;
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
};


export default connectDB;