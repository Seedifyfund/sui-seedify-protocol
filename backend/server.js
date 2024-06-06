import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import vestingRoutes from './routes/vestingRoutes.js';
import cors from 'cors'; // Import the cors package

dotenv.config();

const app = express();

// Connect to the database
connectDB();

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// Mount routes
app.use('/api/vesting', vestingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
    });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});