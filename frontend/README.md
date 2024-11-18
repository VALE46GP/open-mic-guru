# Open Mic Guru

## Overview
Open Mic Guru is a real-time management platform for open mic events, connecting artists, hosts, and audiences. The application streamlines the organization and promotion of open mic nights, providing tools for signup management and real-time updates.

## Key Features
- **Real-time Event Management**: Live updates for performance lineups and event details
- **Google Maps Integration**: Find nearby open mic events and venues
- **User Roles**: Dedicated features for performers, hosts, and audience members
- **Social Integration**: Connect with performers through their linked social media profiles
- **Mobile Responsive**: Seamless experience across all devices

## Technology Stack
### Frontend
- React.js
- React Router for navigation
- WebSocket integration for real-time updates
- Google Maps API for location services
- SASS for styled components
- Bootstrap for responsive design

### Backend
- Express.js server
- PostgreSQL database
- Passport.js for authentication
- JWT for secure sessions
- WebSocket server for real-time communication
- AWS S3 for image storage

## Authentication
- Google OAuth 2.0 integration
- JWT-based session management
- Protected routes and API endpoints
- Secure password handling with bcrypt

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL
- Google Maps API key
- AWS S3 bucket (for image uploads)

### Installation and Setup

#### Backend Setup
1. Navigate to the backend directory:
    ```bash
    cd backend
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Create a `.env` file in the backend directory with the following variables:
    - `PORT`: The port number for the backend server (default is 3001)
    - `DATABASE_URL`: The connection string for the PostgreSQL database
    - `JWT_SECRET`: The secret key for JSON Web Tokens
    - `GOOGLE_CLIENT_ID`: The Google OAuth client ID
    - `GOOGLE_CLIENT_SECRET`: The Google OAuth client secret
    - `AWS_ACCESS_KEY_ID`: The AWS access key ID
    - `AWS_SECRET_ACCESS_KEY`: The AWS secret access key
    - `AWS_REGION`: The AWS region
    - `S3_BUCKET_NAME`: The name of the S3 bucket for image storage


4. Start the backend server:
    ```bash
    npm start
    ```

The backend server will run on `http://localhost:3001`

#### Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Create a `.env` file in the frontend directory with the following variables:
    - `REACT_APP_GOOGLE_API_KEY`: The Google Maps API key
    - `REACT_APP_BACKEND_URL`: The URL of the backend server (default is `http://localhost:3001`)


4. Start the frontend development server:
    ```bash
    npm start
    ```

The frontend application will run on `http://localhost:3000`

### Development
- Frontend tests: `cd frontend && npm test`
- Backend tests: `cd backend && npm test`

### Database Setup
1. Ensure PostgreSQL is installed and running
2. Create a new database named 'open_mic_guru'
3. The backend will automatically create the necessary tables on first run

## Testing
- Frontend tests using Jest and React Testing Library
- API endpoint testing

## Contact
- Eric Callari - [ericdoescode@gmail.com](mailto:ericdoescode@gmail.com)
- Project Link: [https://github.com/VALE46GP/open-mic-guru](https://github.com/VALE46GP/open-mic-guru)
