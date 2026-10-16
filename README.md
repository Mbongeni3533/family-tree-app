# Family Tree Application

A genealogy management web application with invitation-only access control.

## Features

- **Invitation-Only Registration**: Users can only register using a valid invitation token
- **Family Tree Dashboard**: Visual and tabular views of family relationships
- **Hierarchical Tree Visualization**: Interactive vis-network powered tree visualization
- **GEDCOM Export**: Export family tree data in standard GEDCOM format for genealogy software
- **Complete CRUD Operations**: Add, edit, and delete family members with parent-child relationships
- **JWT Authentication**: Secure session management
- **Responsive Design**: Tailwind CSS for modern, responsive UI

## Tech Stack

### Backend
- **Runtime**: Node.js with Express
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Zod for input validation
- **Security**: Helmet, CORS, Rate Limiting

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: React Router DOM 6
- **UI Library**: Tailwind CSS + HeadlessUI
- **Tree Visualization**: vis-network
- **HTTP Client**: Axios

## Requirements

- Node.js 18+ 
- npm 9+
- Claude Code (for development)

## Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Set Up Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit the values as needed
# For production, use strong JWT_SECRET
```

### 3. Initialize Database

```bash
# Navigate to backend
cd backend

# Run Prisma migration
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 4. Start Development Servers

```bash
# From the root directory
npm run dev

# Backend will run on http://localhost:3000
# Frontend will run on http://localhost:5173
```

## Project Structure

```
family-tree-app/
├── backend/
│   ├── prisma/           # Database schema
│   └── src/
│       ├── middleware/    # Auth middleware
│       ├── routes/        # API routes (auth, family)
│       └── index.ts       # Server entry point
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # Auth context
│   │   ├── pages/         # Page components
│   │   ├── styles/        # CSS styles
│   │   └── types/         # TypeScript types
│   └── vite.config.ts     # Vite config
├── .env.example           # Environment template
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/invite` - Generate invitation token (Admin only)
- `POST /api/auth/register` - Register with invitation token
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Family
- `GET /api/family` - Get all family members
- `POST /api/family/person` - Create new family member
- `PUT /api/family/person/:id` - Update family member
- `DELETE /api/family/person/:id` - Delete family member
- `GET /api/family/tree` - Get hierarchical tree data
- `GET /api/family/export/gedcom` - Export as GEDCOM format

## Invitation System

### Generate Invitation

```bash
curl -X POST http://localhost:3000/api/auth/invite \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "name": "John Doe"}'
```

### Register with Invitation

Users receive an invitation token in the response. They use it to register:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "invitationToken": "inv_1234567890_abc123",
    "name": "John Doe"
  }'
```

## Production Deployment

### Build

```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd ../backend
npm run build
```

### Database Migration

```bash
cd backend
npx prisma migrate deploy
```

## Security Considerations

- All routes require valid JWT token
- Invitation tokens expire after 7 days
- Rate limiting enabled on auth endpoints
- Passwords hashed with bcrypt
- CORS configured for frontend origin
- Helmet middleware for security headers

## License

MIT License