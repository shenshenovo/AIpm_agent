# AI PM Job Search Agent

AI PM Job Search Agent is a Next.js application for AI product manager job preparation. It helps users maintain a capability profile, analyze job descriptions, generate learning plans, and practice interview questions through Coze workflows.

## Features

- Capability profile for target role, company type, skills, projects, and weakness tags
- JD analysis workflow for extracting role requirements and preparation direction
- Learning plan workflow based on profile, JD analysis, and weakness tags
- Interview training workflow with question generation and answer review
- Local SQLite storage through Prisma

## Tech Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Prisma with SQLite
- Coze workflow API integration

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.local.example .env.local
```

Fill in the required Coze workflow values in `.env.local`.

Initialize the local database:

```bash
npx prisma generate
npx prisma db push
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Environment Variables

The project uses `.env.local.example` as the public template. Keep real tokens and workflow IDs in `.env.local` only.

Key variables:

- `COZE_API_BASE_URL`
- `COZE_API_TOKEN`
- `COZE_WORKFLOW1_ID`
- `COZE_WORKFLOW2_ID`
- `COZE_WORKFLOW3_ID`
- `COZE_WORKFLOW4_ID`
- `COZE_WORKFLOW5_ID`
- `DATABASE_URL`

## Scripts

```bash
npm run dev
npm run build
npm run start
```

## Notes

`.env.local`, local SQLite database files, build output, dependencies, and development logs are ignored by Git.
