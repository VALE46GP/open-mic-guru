# Open Mic Guru

## Overview
Open Mic Guru is a real-time management platform for open mic events, connecting artists, hosts, and audiences. The application streamlines the organization and promotion of open mic nights, providing tools for signup management, real-time updates, and comprehensive event coordination.

## Key Features

### Real-time Event Management
- Live updates for performance lineups and event details using WebSocket integration
- Dynamic slot management with automatic time calculations
- Drag-and-drop lineup reordering
- Automatic event duration extension handling
- Event status tracking (active/cancelled)

### Advanced Notification System
- Real-time notifications for event updates, lineup changes, and user interactions
- Grouped notifications by event with unread indicators
- Batch operations (mark as read, delete)
- Customizable notification preferences
- WebSocket-powered instant updates

### User Management
- Role-based access control (performers, hosts, audience)
- Comprehensive user profiles with social media integration
- Secure authentication using JWT and Google OAuth 2.0
- Protected routes and API endpoints
- Image upload capability with AWS S3 integration

### Event Features
- Interactive Google Maps integration for venue location
- Real-time performance slot management
- Automatic time slot calculations
- Event history tracking
- Image management with AWS S3

### Mobile-First Design
- Responsive layout using Bootstrap and SASS
- Custom styling with modular SASS architecture
- Cross-device compatibility
- Touch-friendly interface elements

## Technical Implementation

### Frontend Architecture
- React.js with functional components and hooks
- Context API for state management
- Custom hooks for reusable logic
- Real-time WebSocket integration
- Modular SASS styling with BEM methodology

### Backend Architecture
- Express.js RESTful API
- PostgreSQL database with complex relationships
- WebSocket server for real-time updates
- JWT-based authentication
- AWS S3 integration for media storage

### Testing
- Jest and React Testing Library for frontend testing
- API endpoint testing
- Mock service worker for API simulation
- Comprehensive test coverage

### Security
- JWT-based session management
- Protected API endpoints
- Secure password handling with bcrypt
- CORS configuration
- Environment variable management

### Best Practices
- Component-based architecture
- Custom hook abstractions
- Responsive design patterns
- Error boundary implementation
- Comprehensive error handling
- Type-safe API interactions

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
    ```
    # Server Configuration
    PORT=                    # The port number for the backend server (default: 3001)
    NODE_ENV=               # Environment setting (development/production)
    
    # Database
    DATABASE_URL=           # PostgreSQL connection string
    
    # Authentication
    JWT_SECRET=             # Secret key for JSON Web Tokens
    GOOGLE_CLIENT_ID=       # Google OAuth client ID
    GOOGLE_CLIENT_SECRET=   # Google OAuth client secret
    CALLBACK_URL=           # OAuth callback URL (update for production)
    
    # AWS Configuration
    AWS_ACCESS_KEY_ID=      # AWS access key ID for S3
    AWS_SECRET_ACCESS_KEY=  # AWS secret access key for S3
    AWS_REGION=             # AWS region (e.g., us-west-1)
    S3_BUCKET_NAME=         # S3 bucket name for image storage
    
    # Development
    REACT_APP_DEV_IP=      # Development IP address for local testing
    ```

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

3. Create a `.env` file in the frontend directory:
    ```
    # Google Maps Integration
    REACT_APP_GOOGLE_API_KEY=    # Google Maps API key for location services

    # AWS Configuration
    AWS_ACCESS_KEY_ID=           # AWS access key ID for S3
    AWS_SECRET_ACCESS_KEY=       # AWS secret access key for S3
    AWS_REGION=                  # AWS region (e.g., us-west-1)
    S3_BUCKET_NAME=              # S3 bucket name for image storage

    # API Configuration
    REACT_APP_WEBSOCKET_URL=     # WebSocket server URL for real-time updates
    REACT_APP_API_URL=           # Backend API URL
    REACT_APP_DEV_IP=            # Development IP address for local testing
    ```

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

## Development Workflow

### Code Organization
- Modular component structure
- Separation of concerns
- Custom hooks for business logic
- Utility functions for common operations
- Consistent naming conventions

### State Management
- Context API for global state
- Local state with useState
- WebSocket integration for real-time updates
- Optimistic UI updates

### Styling Architecture
- SASS modules with BEM methodology
- Responsive design mixins
- Variable-based theming
- Mobile-first approach

## Testing

### Frontend Testing
- Component unit tests
- Integration testing
- User interaction testing
- WebSocket behavior testing
- Mock service worker for API simulation

### Backend Testing
- API endpoint testing
- Database interaction tests
- WebSocket communication tests
- Authentication flow testing

### Configuration
1. Navigate to the backend/tests directory
2. Copy setup.js.example to setup.js:   ```bash
   cp setup.js.example setup.js   ```
3. Update setup.js with your test credentials

Note: The setup.js file contains test environment variables and should not be committed to version control.

## Testing Setup

The project uses a comprehensive testing setup to ensure code quality and reliability. The testing setup includes:

- **Frontend Testing**: Utilizes Jest and React Testing Library for unit and integration tests. Coverage reports are generated and stored in the `frontend/coverage` directory.
- **Backend Testing**: Uses Jest for testing API endpoints and database interactions. Coverage reports are generated and stored in the `backend/coverage` directory.

### Continuous Integration

The project is integrated with GitHub Actions for continuous integration. The CI pipeline is configured to:

- Run frontend and backend tests in parallel to speed up the testing process.
- Collect coverage reports from both frontend and backend tests.
- Store combined coverage reports in a top-level `coverage` directory.

To run tests locally, use the following commands:

- **Frontend**: Navigate to the `frontend` directory and run `npm test`.
- **Backend**: Navigate to the `backend` directory and run `npm test`.

## Contact
- Eric Callari - [ericdoescode@gmail.com](mailto:ericdoescode@gmail.com)
