# Create MVC Fullstack

A CLI tool to quickly scaffold full stack applications with frontend and backend, supporting both API-only and full stack projects.

## Features

- **API Only Projects**: Create backend-only applications with Express or Hono
- **Full Stack Projects**: Create complete applications with frontend and backend
- **Multiple Databases**: PostgreSQL, MongoDB, MySQL, SQLite
- **Language Support**: JavaScript and TypeScript
- **Frontend Frameworks**: Vite and Next.js
- **Next.js Configuration**: Choose whether to include Tailwind CSS

## Usage

### Interactive Mode

```bash
npx create-mvc-fullstack
```

### Direct Template Usage

```bash
npx create-mvc-fullstack my-project --template fullstack-vite-pg-ts
npx create-mvc-fullstack my-api --template api-pg-ts
```

## Available Templates

### API Only Templates

- `api-pg-ts` - Express + PostgreSQL + TypeScript
- `api-pg` - Express + PostgreSQL + JavaScript
- `api-mongo-ts` - Express + MongoDB + TypeScript
- `api-mongo` - Express + MongoDB + JavaScript
- `api-mysql-ts` - Express + MySQL + TypeScript
- `api-mysql` - Express + MySQL + JavaScript
- `api-sqlite-ts` - Express + SQLite + TypeScript
- `api-sqlite` - Express + SQLite + JavaScript
- `api-hono-pg-ts` - Hono + PostgreSQL + TypeScript
- `api-hono-pg` - Hono + PostgreSQL + JavaScript

### Full Stack Templates

- `fullstack-vite-pg-ts` - Express + PostgreSQL + TypeScript + Vite
- `fullstack-vite-pg` - Express + PostgreSQL + JavaScript + Vite
- `fullstack-vite-mongo-ts` - Express + MongoDB + TypeScript + Vite
- `fullstack-vite-mysql-ts` - Express + MySQL + TypeScript + Vite
- `fullstack-next-pg-ts` - Express + PostgreSQL + TypeScript + Next.js
- `fullstack-next-pg` - Express + PostgreSQL + JavaScript + Next.js
- `fullstack-next-mongo-ts` - Express + MongoDB + TypeScript + Next.js
- `fullstack-next-mysql-ts` - Express + MySQL + TypeScript + Next.js

## Project Structure

### API Only Projects

```
my-project/
├── app.ts
├── controllers/
├── models/
├── routes/
├── db/
├── package.json
└── ...
```

### Full Stack Projects

```
my-project/
├── backend/
│   ├── app.ts
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── db/
│   └── package.json
├── client/
│   ├── src/
│   ├── public/
│   └── package.json
├── package.json
└── ...
```

## Getting Started

### For API Only Projects

```bash
cd my-project
npm install
npm run dev
```

### For Full Stack Projects

```bash
cd my-project
npm run install:all
npm run dev  # Runs both backend and frontend
```

## Interactive Flow

When using interactive mode, the CLI will guide you through:

1. **Project Configuration**: Choose between individual components or templates
2. **Component Selection**: Select server, database, language, and frontend framework
3. **Template Resolution**: System determines the best template match
4. **Next.js Configuration** (if applicable): Choose whether to include Tailwind CSS
5. **Project Creation**: Confirm and create your project

## Development Scripts

### Full Stack Projects

- `npm run dev` - Start both backend and frontend in development mode
- `npm run dev:backend` - Start only the backend
- `npm run dev:frontend` - Start only the frontend
- `npm run build` - Build both backend and frontend
- `npm run install:all` - Install dependencies for all parts

## Differences from create-mvc-server

This package (`create-mvc-fullstack`) includes both API-only and full stack templates, while the main `create-mvc-server` package focuses on API-only projects. Use this package when you want the flexibility to create either type of project.

## License

MIT
