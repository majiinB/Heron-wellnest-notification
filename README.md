# Heron Wellnest Chat Bot API

A real-time chat microservice for the Heron Wellnest platform. This service provides endpoints for managing chat sessions and messages between students and an AI-powered wellbeing bot, with support for encrypted message storage and asynchronous bot response handling via Pub/Sub.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

## ✨ Features

- Get or create active chat sessions for authenticated students
- Send and retrieve encrypted chat messages
- Asynchronous bot response handling via Google Cloud Pub/Sub
- Polling endpoint for bot responses with session state management
- Session status tracking (active, waiting_for_bot, failed, escalated, ended)
- Message sequence validation to prevent concurrent messages
- Failed session retry mechanism
- Role-protected endpoints (student) using JWT-based middleware
- Type-safe codebase with TypeScript and TypeORM

## 🛠 Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Auth**: JWT-based middleware (service uses `heronAuth.middleware`)
- **Message Queue**: Google Cloud Pub/Sub
- **Encryption**: AES-256-CBC for message content
- **Testing**: Jest
- **Linting**: ESLint
- **Containerization**: Docker
- **Cloud Platform**: Google Cloud Run
- **CI/CD**: GitHub Actions

## 🏗 Architecture

The service follows a layered architecture with asynchronous bot integration:

- **Controllers** — HTTP handlers, input validation, and response shaping
- **Services** — business logic, encryption/decryption, and Pub/Sub publishing
- **Repositories** — TypeORM data access and database operations
- **Models** — TypeORM entities (ChatSession, ChatMessage)

### Message Flow

1. **User sends message**: Controller validates → Service encrypts and stores message → Publishes `CHAT_MESSAGE_CREATED` event to Pub/Sub → Session marked as `waiting_for_bot`
2. **Bot worker processes**: Subscribes to Pub/Sub → Generates response → Stores encrypted bot message → Updates session status to `active`
3. **User polls for response**: Controller requests bot message → Service decrypts and returns message if available

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Docker (optional)
- PostgreSQL database

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd chat-api
```

2. Install dependencies

```bash
npm install
```

3. Create `.env` in the project root (see Environment Variables below)

4. Start the development server

```bash
npm run dev
```

The API will be available at `http://localhost:8080` by default.

### Docker (optional)

Build and run locally:

```bash
docker build -t hw-chat-bot-api .
docker run -p 8080:8080 --env-file .env hw-chat-bot-api
```

## 📡 API Endpoints

### Health

- `GET /health` — basic health check

### Journals

- `GET /journals` — list journal entries
- `POST /journals` — create a journal entry

### Gratitude Jar

- `GET /gratitude` — list gratitude entries
- `POST /gratitude` — create a gratitude entry

### Mood Check-ins

- `GET /mood-checks` — list mood check-ins
- `POST /mood-checks` — record a mood check-in

### Flipfeel

- `GET /flipfeel/questions` — list flipfeel questions
- `POST /flipfeel/responses` — submit a response

### Badges

- `GET /badges` — list user badges (awarded)
- `GET /badges/all-obtainable` — list all badges and whether the user has obtained them

Example response shape for `/badges/all-obtainable`:

```json
{
	"success": true,
	"code": "ALL_OBTAINABLE_BADGES_RETRIEVED",
	"message": "All obtainable badges retrieved successfully",
	"data": {
		"badges": [
			{
				"badge": {
					"badge_id": "uuid",
					"name": "New Beginnings",
					"description": "You’ve written your first journal.",
					"icon_url": null,
					"awarded_at": "1970-01-01T00:00:00.000Z"
				},
				"is_obtained": false
			}
		],
		"total": 1
	}
}
```

## 🔧 Environment Variables

Required variables (check `src/config/env.config.ts` for exact names and validation):

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Application environment | `development` or `production` |
| `PORT` | Server port | `8080` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `DB_NAME` | Database name | `chat_bot` |
| `JWT_SECRET` | JWT signing secret used by `heronAuth` middleware | `your-jwt-secret` |
| `JWT_ISSUER` | Service that issues the JWT tokens | `heron-auth-api` |
| `JWT_AUDIENCE` | Audience of the JWT token | `heron-services` |
| `JWT_ALGORITHM` | Algorithm used to sign the JWT token | `HS256` |
| `MESSAGE_CONTENT_ENCRYPTION_KEY` | Encryption key (32 bytes) for AES-256-CBC message encryption | `your-32-byte-encryption-key-here` |
| `MESSAGE_CONTENT_ENCRYPTION_ALGORITHM` | Encryption algorithm | `aes-256-cbc` |
| `PUBSUB_CHAT_BOT_TOPIC` | Google Cloud Pub/Sub topic name for bot message events | `chat-bot-messages` |

Store production secrets in Google Cloud Secret Manager and reference them in Cloud Run deployment.

## 🧪 Testing

Run tests (Jest):

```bash
npm test
```

Run linter (ESLint):

```bash
npm run lint
npm run lint:fix
```

## 📦 Deployment

### GitHub Actions CI/CD

The repository uses GitHub Actions for automated deployment:

- **`staging` branch** — runs ESLint and tests only (no deployment)
- **`main` branch** — runs ESLint, tests, builds Docker image, pushes to Artifact Registry, and deploys to Google Cloud Run

**Workflow**: Push to `staging` to validate changes → Merge to `main` to deploy to production

### Manual deploy to Cloud Run

1. Build and push container image

```bash
docker build -t us-central1-docker.pkg.dev/heron-wellnest/heron-wellnest-repo/hw-chat-bot-api:latest .
docker push us-central1-docker.pkg.dev/heron-wellnest/heron-wellnest-repo/hw-chat-bot-api:latest
```

2. Deploy

```bash
gcloud run deploy hw-chat-bot-api \
  --image us-central1-docker.pkg.dev/heron-wellnest/heron-wellnest-repo/hw-chat-bot-api:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,DB_USER=...,DB_NAME=...,DB_HOST=...,DB_PORT=5432 \
  --set-secrets DB_PASSWORD=DB_PASSWORD:latest,MESSAGE_CONTENT_ENCRYPTION_KEY=CONTENT_ENCRYPTION_KEY:latest,JWT_SECRET=JWT_SECRET:latest
```

## 📁 Project Structure

```
chat-api/
├── .github/
│   └── workflows/
│       └── workflow.yml
├── docs/
│   └── swagger.yaml
├── src/
│   ├── config/
│   │   ├── cors.config.ts
│   │   ├── datasource.config.ts
│   │   ├── env.config.ts
│   │   └── pubsub.config.ts
│   ├── controllers/
│   │   ├── chatMessage.controller.ts
│   │   └── chatSession.controller.ts
│   ├── interface/
│   │   └── authRequest.interface.ts
│   ├── middlewares/
│   │   ├── error.middleware.ts
│   │   ├── heronAuth.middleware.ts
│   │   └── logger.middleware.ts
│   ├── models/
│   │   ├── chatMessage.model.ts
│   │   └── chatSession.model.ts
│   ├── repository/
│   │   ├── chatMessage.repository.ts
│   │   └── chatSession.repository.ts
│   ├── routes/
│   │   ├── chatMessage.routes.ts
│   │   └── chatSession.routes.ts
│   ├── services/
│   │   ├── chatMessage.service.ts
│   │   └── chatSession.service.ts
│   ├── tests/
│   │   ├── auth.test.ts
│   │   └── dbConnection.test.ts
│   ├── types/
│   │   ├── accessTokenClaim.type.ts
│   │   ├── apiResponse.type.ts
│   │   ├── appError.type.ts
│   │   ├── auth.type.ts
│   │   ├── encryptedField.type.ts
│   │   ├── getOrCreateSessionResult.type.ts
│   │   ├── jwtConfig.type.ts
│   │   ├── paginatedSessionMessages.type.ts
│   │   └── safeChatMessage.type.ts
│   ├── utils/
│   │   ├── asyncHandler.util.ts
│   │   ├── authorization.util.ts
│   │   ├── crypto.util.ts
│   │   ├── jwt.util.ts
│   │   ├── logger.util.ts
│   │   ├── message.util.ts
│   │   ├── pubsub.util.ts
│   │   └── session.util.ts
│   ├── app.ts
│   └── index.ts
├── .gitignore
├── Dockerfile
├── eslint.config.js
├── jest.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## 👨‍💻 Development

### Code Style

The project uses ESLint for linting. Run:

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### API Documentation

Interactive API documentation is available via Swagger UI when running the server:

```
http://localhost:8080/api-docs
```

## 📄 License

This project is proprietary software developed for the Heron Wellnest platform.

## 👥 Authors

- **Arthur M. Artugue** - Lead Developer

## 🤝 Contributing

This is a private project. Please contact the project maintainers for contribution guidelines.

## 📞 Support

For issues and questions, please contact the development team.

---

**Last Updated**: 2026-01-19
