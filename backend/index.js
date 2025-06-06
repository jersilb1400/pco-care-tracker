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

// Helper to get the first note category (or throw if none found)
async function getNoteCategoryId(auth) {
  const res = await axios.get('https://api.planningcenteronline.com/people/v2/note_categories', { auth });
  if (res.data.data && res.data.data.length > 0) {
    return res.data.data[0].id; // Use the first category
  }
  throw new Error('No note categories found in PCO');
}

// Helper to create a note on a PCO person
async function createPCONote(personId, noteContent) {
  const baseURL = `https://api.planningcenteronline.com/people/v2/people/${personId}/notes`;
  const auth = {
    username: process.env.PCO_CLIENT_ID,
    password: process.env.PCO_CLIENT_SECRET
  };
  // Get a note category ID
  const note_category_id = await getNoteCategoryId(auth);
  await axios.post(baseURL, {
    data: {
      type: "Note",
      attributes: {
        body: noteContent,
        note_category_id
      }
    }
  }, { auth });
}

// API endpoint to receive intake form submissions
app.post('/api/intake', async (req, res) => {
  console.log('Received intake submission:', JSON.stringify(req.body, null, 2));
  try {
    const {
      personNeedingCare, personNeedingCareEmail, personNeedingCarePhone,
      submitterName, submitterEmail, submitterPhone,
      careType, priority, notes, location
    } = req.body;

    // Validate required fields
    if (!personNeedingCare || !submitterName || !submitterEmail || !careType || !priority) {
      console.error('Missing required fields:', {
        personNeedingCare: !personNeedingCare,
        submitterName: !submitterName,
        submitterEmail: !submitterEmail,
        careType: !careType,
        priority: !priority
      });
      return res.status(400).json({
        error: 'Missing required fields',
        details: {
          personNeedingCare: !personNeedingCare,
          submitterName: !submitterName,
          submitterEmail: !submitterEmail,
          careType: !careType,
          priority: !priority
        }
      });
    }

    const intake = new Intake({
      personNeedingCare, personNeedingCareEmail, personNeedingCarePhone,
      submitterName, submitterEmail, submitterPhone,
      careType, priority, notes, location
    });
    
    console.log('Saving intake to MongoDB:', JSON.stringify(intake, null, 2));
    await intake.save();
    console.log('Intake saved successfully');

    // --- PCO Integration ---
    console.log('Searching for person in PCO:', {
      name: personNeedingCare,
      email: personNeedingCareEmail,
      phone: personNeedingCarePhone
    });
    
    const personId = await findPersonInPCO({
      name: personNeedingCare,
      email: personNeedingCareEmail,
      phone: personNeedingCarePhone
    });

    if (personId) {
      console.log('Found person in PCO with ID:', personId);
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
      
      console.log('Creating PCO note with content:', noteContent);
      try {
        await createPCONote(personId, noteContent);
        console.log('PCO note created successfully');
      } catch (noteError) {
        console.error('Error creating PCO note:', {
          error: noteError.message,
          response: noteError.response?.data,
          status: noteError.response?.status
        });
        // Don't fail the whole request if note creation fails
      }
    } else {
      console.log('No matching PCO person found for intake submission');
    }

    res.status(201).json({ message: 'Submission saved' });
  } catch (err) {
    console.error('Error in /api/intake:', {
      message: err.message,
      stack: err.stack,
      response: err.response?.data,
      status: err.response?.status
    });
    
    // Send a more detailed error response
    res.status(500).json({
      error: 'Failed to process submission',
      details: {
        message: err.message,
        type: err.name,
        status: err.response?.status,
        pcoError: err.response?.data
      }
    });
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