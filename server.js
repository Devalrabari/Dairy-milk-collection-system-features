const mongoose = require('mongoose');
const cors = require('cors');
const express = require('express');

const app = express();
app.use(express.json());
app.use(cors());

// ✅ અહીં તમારી MongoDB Atlas ની સાચી લિંક પ્રોપર સેટ કરી દીધી છે
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://devalrabari7990:db_user-db_password@cluster0.4rxrknt.mongodb.net/?retryWrites=true&w=majority";

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
  date: String,
  userid: String,
  shift: String,
  liter: Number,
  fat: Number,
  rate: Number,
  total: Number
});
const MilkEntry = mongoose.model('MilkEntry', milkSchema);

// 3. Farmer (Grahak) Schema
const farmerSchema = new mongoose.Schema({
  userScope: { type: String, required: true },
  id: { type: String, required: true, unique: true },
  farmerName: { type: String, required: true }
});
farmerSchema.index({ userScope: 1, id: 1 }, { unique: true });
const Farmer = mongoose.model('Farmer', farmerSchema);

// ======= API ROUTES =======

// Register Operator
app.post('/api/register', async (req, res) => {
  try {
    const { mobile, pass } = req.body;
    
    // Check if operator already exists
    const exist = await User.findOne({ mobile });
    if (exist) return res.status(400).json({ msg: "આ મોબાઈલ નંબર ઓલરેડી રજીસ્ટર્ડ છે." });

    const newUser = new User({ mobile, pass });
    await newUser.save();
    res.status(201).json({ msg: "ઓપરેટર રજીસ્ટ્રેશન સફળ રહ્યું!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login Operator
app.post('/api/login', async (req, res) => {
  try {
    const { mobile, pass } = req.body;
    const user = await User.findOne({ mobile, pass });
    if (!user) return res.status(400).json({ msg: "મોબાઈલ નંબર અથવા પાસવર્ડ ખોટો છે." });
    res.json({ msg: "લોગીન સફળ રહ્યું!", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Farmer
app.post('/api/farmers', async (req, res) => {
  try {
    const { userScope, id, farmerName } = req.body;
    const newFarmer = new Farmer({ userScope, id, farmerName });
    await newFarmer.save();
    res.status(201).json({ msg: "ગ્રાહક સફળતાપૂર્વક ઉમેરાયો!" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: "આ આઈડી વાળો ગ્રાહક ઓલરેડી મોજૂદ છે." });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get All Farmers by Operator
app.get('/api/farmers/:userScope', async (req, res) => {
  try {
    const farmers = await Farmer.find({ userScope: req.params.userScope });
    res.json(farmers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Milk Entry
app.post('/api/milk', async (req, res) => {
  try {
    const { date, userid, shift, liter, fat, rate, total } = req.body;
    const newEntry = new MilkEntry({ date, userid, shift, liter, fat, rate, total });
    await newEntry.save();
    res.status(201).json({ msg: "દૂધની એન્ટ્રી સેવ થઈ ગઈ!" });
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

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  
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
