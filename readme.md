# Congregational Care Tracker

A full-stack application for managing and tracking congregational care requests, integrating with Monday.com and Planning Center Online (PCO).

## Overview
This app allows staff and volunteers to submit, track, and manage care requests for members of the congregation. It features a modern Next.js frontend, a Node.js/Express backend, MongoDB for data storage, and integration with PCO People for note creation.

## Features
- Submit care requests via a user-friendly form
- Track care types, priority, notes, and location
- Automatically create notes in PCO People for the person needing care
- Admin dashboard (future)

## Project Structure
```
pco-care-tracker/
  backend/      # Express API, MongoDB models, PCO integration
  frontend/     # Next.js app (React UI)
  scripts/      # Utility scripts (e.g., extract care types)
  public/       # Static assets (logo, etc.)
  readme.md     # This file
```

## Setup
1. **Clone the repo:**
   ```bash
   git clone https://github.com/your-org/pco-care-tracker.git
   cd pco-care-tracker
   ```
2. **Install dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. **Set up environment variables:**
   - Copy `.env.example` to `.env` in both `backend/` and `frontend/` as needed.
   - Fill in the required values (see below).

## Environment Variables
**Backend (`backend/.env`):**
```
MONGODB_URI=your_mongodb_connection_string
PCO_CLIENT_ID=your_pco_pat_or_app_id
PCO_CLIENT_SECRET=your_pco_pat_or_app_secret
SESSION_SECRET=your_session_secret
```
**Frontend (`frontend/.env`):**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

## Deployment
- Deploy both frontend and backend to [Render](https://render.com/) or your preferred platform.
- Use the provided `render.yaml` for automated setup (if available).
- Set environment variables in the Render dashboard (never commit real secrets to GitHub).

## License
MIT 