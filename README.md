# FES Mobile App - Team Handoff Document

## Project Overview
**FES Mobile** is a React Native app for Functional Electrical Stimulation therapy. It uses gyroscope data from a phone worn on the leg to detect gait events and trigger electrical impulses for foot drop treatment.

---

## Current State

### What's Working:
- Basic authentication (login/signup) with local storage
- Gyroscope/accelerometer sensor data collection
- Navigation between screens
- Clean UI with proper theming

### What's Broken/Missing:
- **No real backend** - everything is mocked/local storage
- **No database** - user data stored in AsyncStorage (not scalable)
- **No Bluetooth** - FES device communication missing
- **No real authentication** - passwords stored in plain text
- **No data persistence** - sensor data not saved
- **No user management** - no admin features
- **No security** - no encryption, no proper auth tokens

---

## Current Tech Stack

### Frontend (React Native/Expo)
- **Framework:** Expo SDK 54 + React Native 0.81.4
- **Navigation:** Expo Router (file-based routing)
- **State Management:** React Context (AuthContext)
- **Storage:** AsyncStorage (local only)
- **Sensors:** expo-sensors (gyroscope, accelerometer)
- **UI:** Custom themed components
- **Location:** `FES-app/FES/` directory

### Backend: NONE
- Currently using mock authentication
- No API endpoints
- No server infrastructure

### Database: NONE
- Using AsyncStorage (local device storage)
- No user data persistence
- No sensor data storage

---

## Target Architecture (Long-term)

### Frontend
- Keep React Native/Expo
- Add proper state management (Redux/Zustand)
- Add offline data sync
- Add proper error handling

### Backend
- **Node.js/Express** or **Python/FastAPI**
- **RESTful API** with proper authentication
- **WebSocket** for real-time sensor data
- **Bluetooth integration** for FES device communication

### Database
- **PostgreSQL** for user data and sessions
- **InfluxDB** or **TimescaleDB** for sensor time-series data
- **Redis** for caching and real-time features

### Infrastructure
- **AWS/GCP** for hosting
- **Docker** for containerization
- **CI/CD** with GitHub Actions

---

## Team Assignments & Action Items

---

## BACKEND TEAM

### Current State:
- **Location:** `FES-app/FES/services/authService.ts` (mock Firebase service)
- **Tech:** Mock Firebase functions (not connected to real Firebase)
- **Status:** 100% mocked, needs complete rewrite

### Action Items (Easy Wins):

#### Week 1-2: Foundation
1. **Set up Node.js/Express server**
   - Create `backend/` directory
   - Set up basic Express server with TypeScript
   - Add CORS, helmet, rate limiting
   - Create basic health check endpoint

2. **Implement User Authentication**
   - Replace mock auth with real JWT tokens
   - Add password hashing (bcrypt)
   - Create login/signup endpoints
   - Add input validation

#### Week 3-4: Core Features
3. **User Management API**
   - GET/PUT `/api/users/profile`
   - POST `/api/users/change-password`
   - DELETE `/api/users/account`

4. **Sensor Data API**
   - POST `/api/sensor-data` (receive gyroscope data)
   - GET `/api/sensor-data/history`
   - WebSocket for real-time data streaming

#### Week 5-6: Advanced Features
5. **FES Device Communication**
   - Bluetooth integration research
   - Device pairing endpoints
   - Stimulation trigger API

6. **Session Management**
   - Start/stop therapy sessions
   - Session data logging
   - Progress tracking

### Files to Create:
backend/
├── src/
│ ├── controllers/
│ ├── middleware/
│ ├── models/
│ ├── routes/
│ └── services/
├── package.json
└── server.ts


---

## DATABASE + SECURITY TEAM

### Current State:
- **Location:** `FES-app/FES/contexts/AuthContext.tsx` (AsyncStorage)
- **Tech:** Local device storage only
- **Status:** No real database, no security

### Action Items (Easy Wins):

#### Week 1-2: Database Setup
1. **Choose Database Stack**
   - PostgreSQL for user data
   - Redis for sessions/caching
   - Set up local development environment

2. **Design Database Schema**
   ```sql
   -- Users table
   CREATE TABLE users (
     id UUID PRIMARY KEY,
     username VARCHAR(50) UNIQUE,
     email VARCHAR(100) UNIQUE,
     password_hash VARCHAR(255),
     created_at TIMESTAMP
   );
   
   -- Sensor data table
   CREATE TABLE sensor_readings (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES users(id),
     gyro_x FLOAT,
     gyro_y FLOAT,
     gyro_z FLOAT,
     timestamp TIMESTAMP
   );
   ```

#### Week 3-4: Security Implementation
3. **Authentication Security**
   - JWT token implementation
   - Refresh token rotation
   - Password strength requirements
   - Account lockout after failed attempts

4. **Data Encryption**
   - Encrypt sensitive user data
   - Hash passwords with bcrypt
   - Secure API endpoints with rate limiting

#### Week 5-6: Data Management
5. **Sensor Data Storage**
   - Time-series data optimization
   - Data retention policies
   - Backup strategies

6. **Privacy & Compliance**
   - GDPR compliance review
   - Data anonymization
   - Audit logging

### Files to Create:
database/
├── migrations/
├── seeds/
├── schema.sql
└── docker-compose.yml


---

## FRONTEND TEAM

### Current State:
- **Location:** `FES-app/FES/app/` (main app directory)
- **Tech:** Expo Router, React Context, AsyncStorage
- **Status:** Basic UI working, needs backend integration

### Action Items (Easy Wins):

#### Week 1-2: Backend Integration
1. **Replace Mock Authentication**
   - Update `contexts/AuthContext.tsx` to use real API
   - Add proper error handling
   - Implement token refresh logic

2. **API Service Layer**
   - Create `services/api.ts` for HTTP requests
   - Add request/response interceptors
   - Implement offline data caching

#### Week 3-4: Enhanced UI/UX
3. **Improve User Experience**
   - Add loading states and error messages
   - Implement proper form validation
   - Add user feedback (toasts, alerts)

4. **Sensor Data Visualization**
   - Create charts for sensor data history
   - Add real-time data display
   - Implement data export features

#### Week 5-6: Advanced Features
5. **Bluetooth Integration**
   - Add Bluetooth scanning
   - Device pairing interface
   - Connection status indicators

6. **Session Management**
   - Therapy session tracking
   - Progress monitoring
   - Data synchronization

### Files to Update:
├── services/
│ ├── api.ts (NEW)
│ └── authService.ts (UPDATE)
├── contexts/
│ └── AuthContext.tsx (UPDATE)
└── components/
└── (add new components)


---

## Critical Issues to Address First

### 1. Security (URGENT)
- Passwords stored in plain text
- No authentication tokens
- No API security

### 2. Data Persistence (URGENT)
- User data lost on app reinstall
- No sensor data backup
- No cloud synchronization

### 3. Scalability (HIGH)
- Local storage won't scale
- No user management
- No multi-device support

---

## Communication Plan

### Weekly Reviews:
- Demo working features
- Address blockers
- Plan next week's priorities

### Slack Channels:
- Will make subchannels for each team, give summary of work that should be completed that week.

---

## Success Metrics

### Week 2:
- [ ] Real authentication working
- [ ] Database connected
- [ ] Basic API endpoints functional

### Week 4:
- [ ] Sensor data being saved
- [ ] User management working
- [ ] Security measures implemented

### Week 6:
- [ ] Full app functionality
- [ ] Bluetooth integration
- [ ] Production-ready deployment

---

## Quick Start Commands

```bash
# Frontend (current working directory)
cd FES-app/FES
npm install
npm start

# Backend (to be created)
cd backend
npm init -y
npm install express typescript @types/node

# Database (to be created)
docker-compose up -d postgres redis
```

---

**Remember:** Start with the easy wins to build momentum! The foundation is solid, but we need to move from "demo" to "production-ready" quickly.







