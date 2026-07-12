const mongoose = require('mongoose');
const cors = require('cors');
const express = require('express');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Cloud Connection
mongoose.connect(process.env.MONGO_URI || "mongodb+srv://devalrabari7990:deval7998@cluster0.4rxrknt.mongodb.net/dairy")
.then(() => console.log("MongoDB Cloud Connected!"))
.catch(err => console.log("❌ DB Connection Error:", err));

// ==========================================
// 1. SCHEMAS & MODELS
// ==========================================

// Users Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    mobile: { type: String, required: true, unique: true },
    pass: { type: String, required: true }
});
const user = mongoose.model('user', userSchema);

// Milk Collection Schema
const milkSchema = new mongoose.Schema({
    date: String,
    userScope: String,
    userid: String,
    shift: String,
    liter: Number,
    fat: Number,
    rate: Number,
    total: Number
});
const MilkEntry = mongoose.model('MilkEntry', milkSchema);

// Farmer (Grahak) Schema
const farmerSchema = new mongoose.Schema({
    userScope: { type: String, required: true },
    id: { type: String, required: true },
    farmerName: { type: String, required: true },
    mobile: { type: String, required: true }
});
// Composite index to keep combination of userScope and id unique
farmerSchema.index({ userScope: 1, id: 1 }, { unique: true });
const farmer = mongoose.model('farmer', farmerSchema);

// ==========================================
// 2. API ROUTES
// ==========================================

// Register Operator
app.post('/api/register', async (req, res) => {
    try {
        const { username, mobile, pass } = req.body;
        const exist = await user.findOne({ mobile });
        if (exist) return res.status(400).json({ msg: "મોબાઈલ નંબર અગાઉ થીજ રજીસ્ટર છે." });

        const newUser = new user({ username, mobile, pass });
        await newUser.save();
        res.status(200).json({ msg: "રજીસ્ટ્રેશન સફળ રહ્યું" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login Operator
app.post('/api/login', async (req, res) => {
    try {
        const { mobile, pass } = req.body;
        const userScope = await user.findOne({ mobile, pass });
        if (!userScope) return res.status(400).json({ msg: "મોબાઈલ નંબર અથવા પાસવર્ડ ખોટો છે." });
        res.status(200).json({ userScope });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Farmer
app.post('/api/farmers', async (req, res) => {
    try {
        const { userScope, id, farmerName, mobile } = req.body;
        const exist = await farmer.findOne({ userScope, mobile });
        if (exist) return res.status(400).json({ msg: "આ મોબાઆલ નંબર અગાઉ થીજ ઉમેરેલ છે." });

        const newFarmer = new farmer({ userScope, id, farmerName, mobile });
        await newFarmer.save();
        res.status(200).json({ msg: "ગ્રાહક સફળતાપૂર્વક ઉમેરાયો." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Farmers by Operator
app.get('/api/farmers/:userScope', async (req, res) => {
    try {
        const farmers = await farmer.find({ userScope: req.params.userScope });
        res.json(farmers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Milk Entry
app.post('/api/milk', async (req, res) => {
    try {
        const { date, userScope, userid, shift, liter, fat, rate, total } = req.body;
        const newMilkEntry = new MilkEntry({ date, userScope, userid, shift, liter, fat, rate, total });
        await newMilkEntry.save();
        res.status(200).json({ msg: "દૂધ ભરાઈ ગયું છે." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Milk Records by Date & Shift
app.get('/api/milk/:userid', async (req, res) => {
    try {
        const { date, shift } = req.query;
        let query = { userid: req.params.userid };
        if (date) query.date = date;
        if (shift) query.shift = shift;

        const records = await MilkEntry.find(query);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Farmer
app.delete('/api/farmers/:userScope/:id', async (req, res) => {
    try {
        await farmer.deleteOne({ userScope: req.params.userScope, id: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save/Update Milk Entry
app.post('/api/milk/edit', async (req, res) => {
    try {
        const { editIdx, targetScope, record } = req.body;
        if (editIdx > -1) {
            const entries = await MilkEntry.find({ userScope: targetScope });
            if (entries[editIdx]) {
                await MilkEntry.findByIdAndUpdate(entries[editIdx]._id, record);
            }
        } else {
            const newEntry = new MilkEntry({ userScope: targetScope, ...record });
            await newEntry.save();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Milk Entry
app.delete('/api/milk/:userScope/:idx', async (req, res) => {
    try {
        const entries = await MilkEntry.find({ userScope: req.params.userScope });
        const idx = parseInt(req.params.idx);
        if (entries[idx]) {
            await MilkEntry.findByIdAndDelete(entries[idx]._id);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. SERVER START
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
