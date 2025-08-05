# Listo Backend

A Bun server with Hono, Drizzle ORM, and Groq integration for Apple authentication and AI-powered transcript processing.

## Features

- **Apple Sign-In**: Authenticate users with Apple ID from Expo
- **JWT Sessions**: Secure session management with database storage
- **Streaming AI**: Real-time AI responses using Groq's Llama models
- **Database**: SQLite with Drizzle ORM for user and session management
- **CORS**: Configured for Expo development

## Setup

1. Install dependencies:
```bash
bun install
```

2. Run the setup script (creates .env and runs migrations):
```bash
bun run setup
```

3. Edit `.env` and add your Groq API key:
```bash
GROQ_API_KEY=your-groq-api-key-here
```

4. Start the development server:
```bash
bun run dev
```

## API Endpoints

### Authentication
- `POST /auth/apple` - Authenticate with Apple ID token

### Chat
- `POST /chat/stream` - Stream AI responses from transcript (requires auth)

### User
- `GET /user/profile` - Get user profile (requires auth)

### Health
- `GET /health` - Health check
- `GET /` - API info

## Environment Variables

- `DATABASE_URL` - SQLite database path (default: ./dev.db)
- `JWT_SECRET` - Secret for JWT token signing
- `GROQ_API_KEY` - Your Groq API key
- `PORT` - Server port (default: 3000)

## Database

The app uses SQLite with Drizzle ORM. Schema includes:
- `users` - User accounts linked to Apple ID
- `sessions` - JWT session tokens with expiration

## Development

- `bun run setup` - Initial setup (creates .env and runs migrations)
- `bun run dev` - Start with hot reload
- `bun run db:studio` - Open Drizzle Studio
- `bun run db:generate` - Generate new migrations
- `bun run db:migrate` - Run migrations manually

## Apple Authentication Flow

1. Client gets identity token from Apple Sign In
2. Send token to `POST /auth/apple`
3. Server verifies token and creates/finds user
4. Returns JWT token for future requests
5. Include JWT in `Authorization: Bearer <token>` header
