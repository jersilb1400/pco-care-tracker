require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

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

// Helper to search for a person in PCO People
async function findPersonInPCO({ name, email, phone }) {
  const baseURL = 'https://api.planningcenteronline.com/people/v2/people';
  const auth = {
    username: process.env.PCO_CLIENT_ID,
    password: process.env.PCO_CLIENT_SECRET
  };

  let params = {};
  if (email) params['where[email]'] = email;
  else if (phone) params['where[phone_number]'] = phone;
  else if (name) params['where[search_name]'] = name;
  else return null;

  const res = await axios.get(baseURL, { params, auth });
  if (res.data.data && res.data.data.length > 0) {
    return res.data.data[0].id;
  }
  return null;
}

// Helper to create a note on a PCO person
async function createPCONote(personId, noteContent) {
  const baseURL = `https://api.planningcenteronline.com/people/v2/people/${personId}/notes`;
  const auth = {
    username: process.env.PCO_CLIENT_ID,
    password: process.env.PCO_CLIENT_SECRET
  };
  await axios.post(baseURL, {
    data: {
      type: "Note",
      attributes: {
        content: noteContent
      }
    }
  }, { auth });
}

// API endpoint to receive intake form submissions
app.post('/api/intake', async (req, res) => {
  try {
    const {
      personNeedingCare, personNeedingCareEmail, personNeedingCarePhone,
      submitterName, submitterEmail, submitterPhone,
      careType, priority, notes, location
    } = req.body;

    const intake = new Intake({
      personNeedingCare, personNeedingCareEmail, personNeedingCarePhone,
      submitterName, submitterEmail, submitterPhone,
      careType, priority, notes, location
    });
    await intake.save();

    // --- PCO Integration ---
    const personId = await findPersonInPCO({
      name: personNeedingCare,
      email: personNeedingCareEmail,
      phone: personNeedingCarePhone
    });

    if (personId) {
      const submittedAt = new Date().toLocaleString();
      const noteContent = `
Care Intake Submission (${submittedAt})

Person Needing Care:
  Name: ${personNeedingCare}
  Email: ${personNeedingCareEmail || 'N/A'}
  Phone: ${personNeedingCarePhone || 'N/A'}

Submitted By:
  Name: ${submitterName}
  Email: ${submitterEmail}
  Phone: ${submitterPhone || 'N/A'}

Care Type: ${careType}
Priority: ${priority}
Location: ${location || 'N/A'}

Details/Notes:
${notes || 'N/A'}
      `.trim();
      await createPCONote(personId, noteContent);
    }

    res.status(201).json({ message: 'Submission saved' });
  } catch (err) {
    console.error('Error saving intake or sending to PCO:', err, err.response?.data);
    res.status(500).json({ error: 'Failed to save submission or send to PCO' });
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