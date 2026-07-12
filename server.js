const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ⚠️ અહિયાં તમારી MongoDB Atlas ની કનેક્શન લિંક નાખવી
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://devalrabari7998_db_user:<db_password>@cluster0.4rsrknt.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🔥 MongoDB Cloud Connected..."))
  .catch(err => console.error("❌ DB Connection Error:", err));

// 1. Users Schema
const userSchema = new mongoose.Schema({
    mobile: { type: String, required: true, unique: true },
    pass: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// 2. Milk Collection Schema
const milkSchema = new mongoose.Schema({
    userScope: { type: String, required: true }, // કયા ઓપરેટરનો ડેટા છે
    date: String,
    id: String,
    name: String,
    shift: String,
    type: String,
    liter: Number,
    fat: Number,
    rate: Number,
    total: Number
});
const MilkEntry = mongoose.model('MilkEntry', milkSchema);

// 3. Farmer (Grahak) Schema
const farmerSchema = new mongoose.Schema({
    userScope: { type: String, required: true },
    id: { type: String, required: true },
    name: { type: String, required: true }
});
farmerSchema.index({ userScope: 1, id: 1 }, { unique: true });
const Farmer = mongoose.model('Farmer', farmerSchema);

// ====== APIs ROUTES ======

// Register Operator
app.post('/api/register', async (req, res) => {
    try {
        const { mobile, pass } = req.body;
        const exists = await User.findOne({ mobile });
        if (exists) return res.status(400).json({ msg: "⚠️ આ ઓપરેટર રજીસ્ટર છે." });
        
        const newUser = new User({ mobile, pass });
        await newUser.save();
        res.json({ msg: "🎉 નવું ઓપરેટર એકાઉન્ટ સેવ થયું!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Login Operator
app.post('/api/login', async (req, res) => {
    try {
        const { mobile, pass } = req.body;
        const user = await User.findOne({ mobile, pass });
        if (user) res.json({ success: true, mobile });
        else res.status(400).json({ msg: "❌ ખોટો મોબાઈલ કે પાસવર્ડ!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get All Registered Users (For Super Admin)
app.get('/api/super/users', async (req, res) => {
    try {
        const users = await User.find({}, 'mobile pass');
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get All Data for Specific User (Combined Farmers + Entries)
app.get('/api/data/:mobile', async (req, res) => {
    try {
        const farmers = await Farmer.find({ userScope: req.params.mobile });
        const milkEntries = await MilkEntry.find({ userScope: req.params.mobile });
        res.json({ farmers, milkEntries });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add Farmer
app.post('/api/farmers', async (req, res) => {
    try {
        const { userScope, id, name } = req.body;
        const exists = await Farmer.findOne({ userScope, id });
        if (exists) return res.status(400).json({ msg: "⚠️ આ ID ઓલરેડી ઉપયોગમાં છે." });
        
        const f = new Farmer({ userScope, id, name });
        await f.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Inline Edit Farmer Name
app.put('/api/farmers/update', async (req, res) => {
    try {
        const { userScope, id, name } = req.body;
        await Farmer.updateOne({ userScope, id }, { name });
        await MilkEntry.updateMany({ userScope, id }, { name });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete Farmer
app.delete('/api/farmers/:userScope/:id', async (req, res) => {
    try {
        await Farmer.deleteOne({ userScope: req.params.userScope, id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Save/Update Milk Entry
app.post('/api/milk', async (req, res) => {
    try {
        const { editIdx, targetScope, record } = req.body;
        if (editIdx > -1) {
            // Update mode: Find by scope, sort by insertion, get the exact record
            const entries = await MilkEntry.find({ userScope: targetScope });
            if(entries[editIdx]) {
                await MilkEntry.findByIdAndUpdate(entries[editIdx]._id, record);
            }
        } else {
            // New Entry mode
            const newEntry = new MilkEntry({ userScope: targetScope, ...record });
            await newEntry.save();
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete Milk Entry
app.delete('/api/milk/:userScope/:idx', async (req, res) => {
    try {
        const entries = await MilkEntry.find({ userScope: req.params.userScope });
        const idx = parseInt(req.params.idx);
        if(entries[idx]) {
            await MilkEntry.findByIdAndDelete(entries[idx]._id);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
