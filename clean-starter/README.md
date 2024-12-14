# Clean Starter Kit

A modern full-stack starter kit with DDD, TDD, and Hexagonal Architecture.

## Features

- Domain-Driven Design (DDD)
- Test-Driven Development (TDD)
- Hexagonal Architecture
- React Frontend with TypeScript
- Express Server
- SQLite Database with Prisma
- WebSocket Support
- Authentication System
- Clean and Modern UI with Tailwind CSS

## Project Structure

```
clean-starter/
├── src/
│   ├── server/
│   │   ├── core/
│   │   │   ├── domain/       # Domain entities and interfaces
│   │   │   └── application/  # Application services
│   │   ├── infrastructure/
│   │   │   ├── repositories/ # Repository implementations
│   │   │   └── web/         # Express server and routes
│   │   ├── tests/           # Server-side tests
│   │   └── prisma/          # Database schema and migrations
│   └── client/
│       ├── src/
│       │   ├── components/   # React components
│       │   ├── hooks/       # Custom React hooks
│       │   ├── pages/       # Page components
│       │   └── tests/       # Client-side tests
│       └── public/          # Static assets
```

## Getting Started

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Set up the database:
   ```bash
   cd src/server
   npx prisma migrate dev
   ```

3. Start the development servers:
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Available Scripts

- `npm run dev`: Start both client and server in development mode
- `npm run dev:client`: Start only the client
- `npm run dev:server`: Start only the server
- `npm test`: Run all tests
- `npm run test:client`: Run client tests
- `npm run test:server`: Run server tests

## Authentication

The starter kit includes a complete authentication system with:
- User registration
- User login
- Protected routes
- JWT-based authentication
- Secure password hashing

## WebSocket Support

WebSocket connection is automatically established for real-time features. You can extend the WebSocket functionality in:
- Server: `src/server/infrastructure/web/server.ts`
- Client: Create a custom hook for WebSocket handling

## Contributing

Feel free to submit issues and enhancement requests!
