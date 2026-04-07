# MyChat

## Project Overview

MyChat is a browser-based chat app prototype built with React, Vite, Express, and SQLite. It now includes a real local backend so two browser instances on your machine can create the same chat, see the same conversation list, and exchange messages through a shared database instead of browser-only storage.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- Database: SQLite
- Tests: Jest + Testing Library

## Local Development

Install dependencies:

```bash
npm install
```

Run the backend:

```bash
npm run server
```

Run the frontend:

```bash
npm run dev
```

Run both together:

```bash
npm run dev:full
```

The frontend expects the backend at `http://localhost:4000`.

## Local Backend Behavior

- user profiles are still remembered in browser storage for sign-in convenience
- chats and messages are stored in SQLite
- the SQLite database is created locally in `server/data/mychat.sqlite`
- opening two browser windows with different usernames will now show the same chats after polling the local backend

## Verification

Run tests:

```bash
npm test
```

Build the frontend:

```bash
npm run build
```
