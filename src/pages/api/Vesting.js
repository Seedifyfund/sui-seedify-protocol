// pages/api/Vesting.js
import connectDB from '../../lib/db/index';
import vestingSchema from '../../lib/db/models/Vesting';

const createVesting = async (req, res) => {
    try {
        await connectDB(); // Ensure database connection
        const {
            startDate,
            startHour,
            startMinute,
            startPeriod,
            duration,
            durationUnit,
            claimInterval,
            claimIntervalUnit,
            receiver,
            amount,
            transferPercentage
        } = req.body;

        const create = await vestingSchema.create({
            startDate,
            startHour,
            startMinute,
            startPeriod,
            duration,
            durationUnit,
            claimInterval,
            claimIntervalUnit,
            receiver,
            amount,
            transferPercentage,
        });

        res.status(200).json({ message: "createVesting added successfully", create });
    } catch (error) {
        console.error("Error in createVesting:", error);
        res.status(500).json({ message: error.message });
    }
};

const getAllVesting = async (req, res) => {
    try {
        await connectDB(); // Ensure database connection
        const allVesting = await vestingSchema.find().lean();
        res.status(200).json({ message: "done", allVesting });
    } catch (error) {
        console.error("Error in getAllVesting:", error);
        res.status(500).json({ message: error.message });
    }
};

export default async function handler(req, res) {
    switch (req.method) {
        case 'POST':
            await createVesting(req, res);
            break;
        case 'GET':
            await getAllVesting(req, res);
            break;
        default:
            res.setHeader('Allow', ['POST', 'GET']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
