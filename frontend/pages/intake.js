import { useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, Typography, TextField, Button, MenuItem, Box } from '@mui/material';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/material.css';

const careTypes = ["Surgery", "Home Visit", "Hospital Visit", "Illness"];
const priorityOptions = ["Low", "Normal", "High", "Urgent"];

export default function IntakeForm() {
  const [form, setForm] = useState({
    personNeedingCare: '',
    personNeedingCareEmail: '',
    personNeedingCarePhone: '',
    submitterName: '',
    submitterEmail: '',
    submitterPhone: '',
    careType: '',
    priority: '',
    notes: '',
    location: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const validate = () => {
    const newErrors = {};
    if (!form.personNeedingCare) newErrors.personNeedingCare = 'Required';
    if (!form.submitterName) newErrors.submitterName = 'Required';
    if (!form.submitterEmail) newErrors.submitterEmail = 'Required';
    if (!/\S+@\S+\.\S+/.test(form.submitterEmail)) newErrors.submitterEmail = 'Invalid email';
    if (form.personNeedingCareEmail && !/\S+@\S+\.\S+/.test(form.personNeedingCareEmail)) newErrors.personNeedingCareEmail = 'Invalid email';
    if (!form.careType) newErrors.careType = 'Required';
    if (!form.priority) newErrors.priority = 'Required';
    if (form.notes.length > 2000) newErrors.notes = 'Max 2000 characters';
    if (form.personNeedingCare.length > 255) newErrors.personNeedingCare = 'Max 255 characters';
    return newErrors;
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (value, field) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Failed to submit form');
      router.push('/thankyou');
    } catch (err) {
      setErrors({ submit: 'Submission failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#1a4bb7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Card sx={{ maxWidth: 500, width: '100%', borderRadius: 3, boxShadow: 3, py: 6 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Congregational Care Request
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Submit a care need for our congregation
          </Typography>
          <form onSubmit={handleSubmit} noValidate>
            <TextField
              label="Person Needing Care *"
              name="personNeedingCare"
              value={form.personNeedingCare}
              onChange={handleChange}
              error={!!errors.personNeedingCare}
              helperText={errors.personNeedingCare || `${form.personNeedingCare.length}/255`}
              inputProps={{ maxLength: 255 }}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Email of person needing care"
              name="personNeedingCareEmail"
              value={form.personNeedingCareEmail}
              onChange={handleChange}
              error={!!errors.personNeedingCareEmail}
              helperText={errors.personNeedingCareEmail}
              fullWidth
              margin="normal"
              type="email"
            />
            <Box marginY={2}>
              <Typography variant="body2">Phone of person needing care</Typography>
              <PhoneInput
                country={'us'}
                value={form.personNeedingCarePhone}
                onChange={val => handlePhoneChange(val, 'personNeedingCarePhone')}
                inputStyle={{ width: '100%' }}
                inputProps={{ name: 'personNeedingCarePhone' }}
              />
            </Box>
            <TextField
              label="Submitter Name *"
              name="submitterName"
              value={form.submitterName}
              onChange={handleChange}
              error={!!errors.submitterName}
              helperText={errors.submitterName}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Submitter Email *"
              name="submitterEmail"
              value={form.submitterEmail}
              onChange={handleChange}
              error={!!errors.submitterEmail}
              helperText={errors.submitterEmail}
              fullWidth
              margin="normal"
              required
              type="email"
            />
            <Box marginY={2}>
              <Typography variant="body2">Submitter Phone</Typography>
              <PhoneInput
                country={'us'}
                value={form.submitterPhone}
                onChange={val => handlePhoneChange(val, 'submitterPhone')}
                inputStyle={{ width: '100%' }}
                inputProps={{ name: 'submitterPhone' }}
              />
            </Box>
            <TextField
              select
              label="Care Type *"
              name="careType"
              value={form.careType}
              onChange={handleChange}
              error={!!errors.careType}
              helperText={errors.careType}
              fullWidth
              margin="normal"
              required
            >
              <MenuItem value="">Select a care type</MenuItem>
              {careTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Priority *"
              name="priority"
              value={form.priority}
              onChange={handleChange}
              error={!!errors.priority}
              helperText={errors.priority}
              fullWidth
              margin="normal"
              required
            >
              <MenuItem value="">Select a priority</MenuItem>
              {priorityOptions.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Details/Notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              error={!!errors.notes}
              helperText={errors.notes || `${form.notes.length}/2000`}
              inputProps={{ maxLength: 2000 }}
              fullWidth
              margin="normal"
              multiline
              minRows={3}
            />
            <TextField
              label="Location"
              name="location"
              value={form.location}
              onChange={handleChange}
              helperText="Hospital Name, room number, or home address"
              fullWidth
              margin="normal"
            />
            {errors.submit && (
              <Typography color="error" sx={{ mt: 1 }}>{errors.submit}</Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3, bgcolor: '#0073ea' }}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}



