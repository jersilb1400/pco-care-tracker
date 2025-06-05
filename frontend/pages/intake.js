import { useState } from 'react';

export default function IntakeForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    careType: '',
    notes: ''
  });

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    console.log('Form submitted:', form);
    alert('Form submitted! (see console)');
  };

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h2>Care Intake Form</h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
        <div style={{ marginBottom: 10 }}>
          <label>Name<br />
            <input name="name" value={form.name} onChange={handleChange} required style={{ width: '100%' }} />
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Email<br />
            <input name="email" type="email" value={form.email} onChange={handleChange} required style={{ width: '100%' }} />
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Phone<br />
            <input name="phone" value={form.phone} onChange={handleChange} style={{ width: '100%' }} />
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Care Type<br />
            <input name="careType" value={form.careType} onChange={handleChange} style={{ width: '100%' }} />
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Notes<br />
            <textarea name="notes" value={form.notes} onChange={handleChange} style={{ width: '100%' }} />
          </label>
        </div>
        <button type="submit" style={{ padding: '10px 20px', fontSize: 16 }}>Submit</button>
      </form>
    </div>
  );
} 