import mongoose from 'mongoose';

const vestingSchema = new mongoose.Schema({
    investorName:{ type: String, required: true },
    startDate: { type: Date, required: true },
    startHour: { type: Number, required: true },
    startMinute: { type: Number, required: true },
    startPeriod: { type: String, required: true },
    duration: { type: Number, required: true},
    durationUnit: { type: String, required: true },
    claimInterval: { type: Number, required: true }, // Claim interval in days
    claimIntervalUnit: { type: String, required: true }, // Claim interval in days
    receiver: { type: String, required: true }, // Receiver address
    amount: { type: Number, required: true }, // Amount of tokens to vest
    transferPercentage: { type: Number, required: true }
});


const Vesting = mongoose.models.Vesting || mongoose.model('Vesting', vestingSchema);
export default Vesting;
