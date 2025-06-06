require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Mongoose model for intake submissions
const intakeSchema = new mongoose.Schema({
  personNeedingCare: String,
  personNeedingCareEmail: String,
  personNeedingCarePhone: String,
  submitterName: String,
  submitterEmail: String,
  submitterPhone: String,
  careType: String,
  priority: String,
  notes: String,
  location: String,
  createdAt: { type: Date, default: Date.now }
});
const Intake = mongoose.model('Intake', intakeSchema);

// API endpoint to receive intake form submissions
app.post('/api/intake', async (req, res) => {
  try {
    const { personNeedingCare, personNeedingCareEmail, personNeedingCarePhone, submitterName, submitterEmail, submitterPhone, careType, priority, notes, location } = req.body;
    const intake = new Intake({ personNeedingCare, personNeedingCareEmail, personNeedingCarePhone, submitterName, submitterEmail, submitterPhone, careType, priority, notes, location });
    await intake.save();
    res.status(201).json({ message: 'Submission saved' });
  } catch (err) {
    console.error('Error saving intake:', err);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// Placeholder route
app.get('/', (req, res) => {
  res.json({ message: 'Backend API is running!' });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 