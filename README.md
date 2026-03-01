# Heron Wellnest Notification API

Notification microservice for the Heron Wellnest platform. This service provides authenticated endpoints for students to fetch and manage notifications, plus an internal endpoint for secure notification ingestion from Pub/Sub or internal services.

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

- Retrieve paginated notifications for authenticated students
- Retrieve all unread notifications
- Retrieve unread notification count (badge-friendly)
- Mark a single notification as read
- Mark all notifications as read
- Soft-delete notifications (`is_deleted = true`)
- Internal notification creation endpoint for Pub/Sub/service-to-service calls
- JWT-based auth for user endpoints (`heronAuth.middleware`)
- Google OIDC token validation for internal Pub/Sub endpoint (`googleAuth.middleware`)
- Type-safe TypeScript codebase with TypeORM and PostgreSQL

## 🛠 Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Auth**:
  - Heron JWT verification for user-facing endpoints
  - Google-signed JWT verification for internal Pub/Sub endpoint
- **Validation**: Zod (environment validation)
- **API Docs**: Swagger (OpenAPI via `swagger-jsdoc` + `swagger-ui-express`)
- **Testing**: Jest + Supertest
- **Linting**: ESLint
- **Containerization**: Docker
- **Cloud Platform**: Google Cloud Run
- **CI/CD**: GitHub Actions

## 🏗 Architecture

The service follows a layered architecture:

- **Controllers** — HTTP request handling, request validation, and response formatting
- **Services** — business logic for notification read/unread state and deletion flows
- **Repositories** — TypeORM data-access operations
- **Models** — `Notification` entity and database mapping
- **Middlewares** — request logging, auth checks, and centralized error handling

### Notification Flow

1. Internal producer sends a request to `POST /api/v1/notification/internal/pubsub` with Google OIDC Bearer token
2. Service validates payload (`userId`, `type`, `title`, `content`) and persists notification
3. Student clients retrieve notifications using user-authenticated endpoints
4. Student can mark notifications read/read-all or soft-delete

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- Docker (optional)
- PostgreSQL database

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd notification-api
```

2. Install dependencies

```bash
npm install
```

3. Create `.env` in the project root (see [Environment Variables](#environment-variables))

4. Run the development server

```bash
npm run dev
```

The API runs on `http://localhost:8080` by default.

### Build & Start

```bash
npm run build
npm run start
```

### Docker (optional)

Build and run locally:

```bash
docker build -t hw-notification-api .
docker run -p 8080:8080 --env-file .env hw-notification-api
```

## 📡 API Endpoints

Base path: `/api/v1/notification`

### Health

- `GET /health` — Basic health check

### Internal (service-to-service)

- `POST /internal/pubsub` — Create a notification (protected by Google OIDC middleware)

Expected body:

```json
{
  "userId": "98765432-1234-5678-9abc-def012345678",
  "type": "system_alerts",
  "title": "New message received",
  "content": "You have a new notification.",
  "data": {
    "source": "guidance-session",
    "referenceId": "abc-123"
  }
}
```

Valid notification types:

- `activities`
- `reminders`
- `guidance_session`
- `system_alerts`

### Student endpoints (Bearer token required)

- `GET /` — Retrieve paginated notifications
  - Query params:
    - `limit` (default `20`, max `50`)
    - `lastNotificationId` (cursor)
- `GET /unread` — Retrieve all unread notifications
- `GET /unread/count` — Retrieve unread notification count
- `PATCH /read-all` — Mark all unread notifications as read
- `PATCH /:notificationId/read` — Mark a specific notification as read
- `DELETE /:notificationId` — Soft-delete a notification

## 🔧 Environment Variables

Source of truth: `src/config/env.config.ts`

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Application environment | `development` / `production` / `test` |
| `PORT` | HTTP server port | `8080` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `password` |
| `DB_NAME` | PostgreSQL database name | `heron_wellnest_db` |
| `JWT_ALGORITHM` | JWT algorithm for user token validation | `HS256` or `RS256` |
| `JWT_SECRET` | Required when `JWT_ALGORITHM=HS256` | `<min-32-char-secret>` |
| `JWT_PRIVATE_KEY` | Required when `JWT_ALGORITHM=RS256` | `<private-key-content>` |
| `JWT_PUBLIC_KEY` | Required when `JWT_ALGORITHM=RS256` | `<public-key-content>` |
| `JWT_ISSUER` | Expected token issuer | `heron-wellnest-auth-api` |
| `JWT_AUDIENCE` | Expected token audience | `heron-wellnest-users` |
| `MESSAGE_CONTENT_ENCRYPTION_KEY` | Encryption key (min 32 chars) | `<32+ chars>` |
| `MESSAGE_CONTENT_ENCRYPTION_ALGORITHM` | Encryption algorithm | `aes-256-gcm` |
| `MESSAGE_CONTENT_ENCRYPTION_IV_LENGTH` | IV length in bytes | `16` |
| `MESSAGE_CONTENT_ENCRYPTION_KEY_LENGTH` | Key length in bytes | `32` |
| `PUBSUB_AUDIENCE` | Expected audience for Google Pub/Sub JWT | `https://<service-url>` |
| `PUBSUB_SERVICE_ACCOUNT_EMAIL` | Expected Pub/Sub service account email | `pubsub-invoker@project.iam.gserviceaccount.com` |

## 🧪 Testing

Run tests:

```bash
npm test
```

Run linter:

```bash
npm run lint
```

## 📦 Deployment

### GitHub Actions CI/CD

Recommended flow:

- Push to `staging` to validate lint/tests
- Merge to `main` for production deployment

(Exact workflow details depend on your repository workflow files.)

### Manual deploy to Cloud Run (example)

```bash
docker build -t us-central1-docker.pkg.dev/<project-id>/<repo>/hw-notification-api:latest .
docker push us-central1-docker.pkg.dev/<project-id>/<repo>/hw-notification-api:latest

gcloud run deploy hw-notification-api \
  --image us-central1-docker.pkg.dev/<project-id>/<repo>/hw-notification-api:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,DB_USER=...,DB_NAME=...,DB_HOST=...,DB_PORT=5432 \
  --set-secrets DB_PASSWORD=DB_PASSWORD:latest,JWT_SECRET=JWT_SECRET:latest
```

## 📁 Project Structure

```text
notification-api/
├── docs/
│   └── swagger.yaml
├── src/
│   ├── config/
│   │   ├── cors.config.ts
│   │   ├── datasource.config.ts
│   │   ├── env.config.ts
│   │   └── pubsub.config.ts
│   ├── controllers/
│   │   └── notification.controller.ts
│   ├── interface/
│   │   └── authRequest.interface.ts
│   ├── middlewares/
│   │   ├── error.middleware.ts
│   │   ├── googleAuth.middleware.ts
│   │   ├── heronAuth.middleware.ts
│   │   └── logger.middleware.ts
│   ├── models/
│   │   └── notification.model.ts
│   ├── repository/
│   │   └── notification.repository.ts
│   ├── routes/
│   │   └── notification.routes.ts
│   ├── services/
│   │   └── notification.service.ts
│   ├── tests/
│   │   ├── auth.test.ts
│   │   └── dbConnection.test.ts
│   ├── types/
│   │   ├── accessTokenClaim.type.ts
│   │   ├── apiResponse.type.ts
│   │   ├── appError.type.ts
│   │   ├── json.d.ts
│   │   └── jwtConfig.type.ts
│   ├── utils/
│   │   ├── asyncHandler.util.ts
│   │   ├── authorization.util.ts
│   │   ├── jwt.util.ts
│   │   ├── logger.util.ts
│   │   └── pubsub.util.ts
│   ├── app.ts
│   └── index.ts
├── Dockerfile
├── eslint.config.js
├── jest.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## 👨‍💻 Development

### API Documentation

Swagger UI is available when running locally:

- `http://localhost:8080/api-docs`

## 📄 License

This project is proprietary software developed for the Heron Wellnest platform.

## 👥 Authors

- **Arthur M. Artugue** — Lead Developer

## 🤝 Contributing

This is a private project. Contact the project maintainers for contribution guidelines.

## 📞 Support

For issues and questions, contact the development team.

---

**Last Updated**: 2026-03-01
