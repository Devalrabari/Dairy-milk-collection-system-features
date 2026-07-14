const mongoose = require('mongoose');
const cors = require('cors');
const express = require('express');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Cloud Connection
const MONGO_URI = "mongodb+srv://devalrabari7998_db_user:deval7998@cluster0.4rsrknt.mongodb.net/dairy?appName=Cluster0";

mongoose.connect(MONGO_URI)
.then(() => console.log("🔒 MongoDB Cloud Connected!"))
.catch(err => console.log("❌ DB Connection Error:", err));

// ==========================================
// 1. SCHEMAS & MODELS
// ==========================================

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    pass: { type: String, required: true }
});
const user = mongoose.model('user', userSchema);

const milkSchema = new mongoose.Schema({
    date: String,
    userScope: String,
    id: String,       // ફ્રન્ટએન્ડ 'id' મોકલે છે (userid નહિ)
    name: String,     // ફ્રન્ટએન્ડ 'name' મોકલે છે (farmerName નહિ)
    shift: String,
    type: String,     // ગાય / ભેંસ / મિક્સ
    liter: Number,
    fat: Number,
    rate: Number,
    total: Number
});
const MilkEntry = mongoose.model('MilkEntry', milkSchema);

const farmerSchema = new mongoose.Schema({
    userScope: { type: String, required: true },
    id: { type: String, required: true },
    name: { type: String, required: true } // ફ્રન્ટએન્ડ પ્રમાણે 'name' રાખ્યું
});
farmerSchema.index({ userScope: 1, id: 1 }, { unique: true });
const farmer = mongoose.model('farmer', farmerSchema);

// ==========================================
// 2. API ROUTES (ફ્રન્ટએન્ડ સાથે પરફેક્ટ સિંક)
// ==========================================

// ➡️ નવું ઓપરેટર એકાઉન્ટ બનાવો
app.post('/api/register', async (req, res) => {
    try {
        const { mobile, pass } = req.body;
        const exist = await user.findOne({ mobile });
        if (exist) return res.status(400).json({ msg: "❌ આ મોબાઈલ નંબર અગાઉથી રજીસ્ટર છે." });

        const newUser = new user({ username: mobile, mobile, pass });
        await newUser.save();
        res.status(200).json({ msg: "✅ એકાઉન્ટ સફળતાપૂર્વક બની ગયું છે!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ➡️ ઓપરેટર લોગીન
app.post('/api/login', async (req, res) => {
    try {
        const { mobile, pass } = req.body;
        const uScope = await user.findOne({ mobile, pass });
        if (!uScope) return res.status(400).json({ success: false, msg: "❌ મોબાઈલ નંબર અથવા પાસવર્ડ ખોટો છે." });
        
        res.status(200).json({ success: true, mobile: uScope.mobile });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ➡️ 🔄 મુખ્ય લાઈવ ડેટા સિંક રાઉટ (ફ્રન્ટએન્ડની સૌથી મુખ્ય જરૂરિયાત)
app.get('/api/data/:targetUser', async (req, res) => {
    try {
        const scope = req.params.targetUser;
        const farmersList = await farmer.find({ userScope: scope });
        const milkEntriesList = await MilkEntry.find({ userScope: scope });
        
        res.json({
            farmers: farmersList,
            milkEntries: milkEntriesList
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ➡️ નવો ગ્રાહક ઉમેરો
app.post('/api/farmers', async (req, res) => {
    try {
        const { userScope, id, name } = req.body;
        const exist = await farmer.findOne({ userScope, id });
        if (exist) return res.status(400).json({ msg: "❌ આ ગ્રાહક ID પહેલેથી ઉપયોગમાં છે!" });

        const newFarmer = new farmer({ userScope, id, name });
        await newFarmer.save();
        res.status(200).json({ msg: "ગ્રાહક સફળતાપૂર્વક ઉમેરાયો." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ➡️ ગ્રાહકનું નામ ઇનલાઈન અપડેટ કરો
app.put('/api/farmers/update', async (req, res) => {
    try {
        const { userScope, id, name } = req.body;
        const updatedFarmer = await farmer.findOneAndUpdate({ userScope, id }, { name }, { new: true });
        
        if (!updatedFarmer) return res.status(404).json({ msg: "ગ્રાહક મળ્યો નથી." });

        // ગ્રાહકનું નામ બદલાય તો જૂની દૂધ એન્ટ્રીઓમાં પણ નામ બદલાઈ જશે
        await MilkEntry.updateMany({ userScope, id }, { name });

        res.json({ msg: "ગ્રાહક સફળતાપૂર્વક સુધારાયો." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ➡️ ગ્રાહક ડીલીટ કરો
app.delete('/api/farmers/:userScope/:id', async (req, res) => {
    try {
        await farmer.deleteOne({ userScope: req.params.userScope, id: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ➡️ દૂધ એન્ટ્રી સેવ અને એડિટ કરો (Single Endpoint Route)
app.post('/api/milk', async (req, res) => {
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

// ➡️ દૂધ એન્ટ્રી ડીલીટ કરો
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
// 3. 👑 SUPER ADMIN ENDPOINT
// ==========================================
app.get('/api/super/users', async (req, res) => {
    try {
        const usersList = await user.find({}, 'mobile pass');
        res.json(usersList);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 4. SERVER START
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running live on port ${PORT}`));
