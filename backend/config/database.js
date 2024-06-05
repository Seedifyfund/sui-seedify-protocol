import mongoose from 'mongoose';

const connectDB = async () => {
    const dbUrl = "mongodb+srv://adilrana03:Adilrana03@cluster1.u50gzns.mongodb.net/?retryWrites=true&w=majority&appName=artfi"

    try {
        const conn = await mongoose.connect(dbUrl, {
            useUnifiedTopology: true,
            useNewUrlParser: true,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;