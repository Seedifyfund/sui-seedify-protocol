import Vesting from '../models/Vesting.js';

const createVesting = async (req, res) => {
    try {
        const {
            investorName,
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

        console.log(investorName, startDate, startHour)

        const create = await Vesting.create({
            investorName,
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

        res.status(200).json({ message: "Vesting created successfully", create });
    } catch (error) {
        console.error("Error in createVesting:", error);
        res.status(500).json({ message: error.message });
    }
};

const getAllVesting = async (req, res) => {
    try {
        const allVesting = await Vesting.find().lean();
        res.status(200).json({ message: "done", allVesting });
    } catch (error) {
        console.error("Error in getAllVesting:", error);
        res.status(500).json({ message: error.message });
    }
};

export { createVesting, getAllVesting };