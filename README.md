# RendrAI

> **AI-powered frontend application builder that transforms natural language into complete, editable, live-running frontend applications.**

![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-22.x-green)
![Status](https://img.shields.io/badge/status-Active-success)

---

## Overview

RendrAI is an AI-powered frontend application builder capable of planning, architecting, generating, validating, building, previewing, and iteratively editing complete frontend applications from natural language prompts.

Unlike simple AI code generators, RendrAI follows a structured multi-stage generation pipeline consisting of dedicated planning, architecture, generation, validation, runtime, and editing stages to produce deterministic and maintainable frontend projects.

---

## Features

### AI Generation

- Multi-stage AI generation pipeline
- Natural language application planning
- AI architecture planning
- Context-aware multi-file generation
- React + TypeScript support
- Vanilla HTML/CSS/JavaScript support
- Deterministic template engine
- Batch generation
- Component validation
- Context-aware file generation

---

### Runtime Engine

- Automatic workspace creation
- Live Vite preview
- Dependency installation
- Dependency caching
- Workspace synchronization
- Runtime lifecycle management
- Hot reload support

---

### Code Editing

- Monaco Editor integration
- Automatic save
- Persistent file editing
- MongoDB synchronization
- Live preview updates

---

### Project Management

- Secure authentication
- Project dashboard
- Project persistence
- AI planning history
- Builder workspace

---

## AI Pipeline

```text
User Prompt
      │
      ▼
Planner
      │
      ▼
Architecture Generator
      │
      ▼
Template Engine
      │
      ▼
Context Builder
      │
      ▼
Generator
      │
      ▼
Validator
      │
      ▼
Workspace
      │
      ▼
Dependency Installation
      │
      ▼
Live Preview
      │
      ▼
Monaco Editing
      │
      ▼
MongoDB Persistence
```

---

## Architecture

```text
apps/
│
├── client/
│
└── server/
      │
      ├── modules/
      │
      ├── ai/
      │     ├── planner/
      │     ├── architect/
      │     ├── generator/
      │     ├── validator/
      │     ├── context/
      │     └── templates/
      │
      ├── runtime/
      │
      ├── auth/
      │
      └── projects/
```

---

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Monaco Editor
- Zustand
- React Router

### Backend

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose

### AI

- Gemini API
- Structured JSON Generation
- Zod Validation

### Runtime

- Vite
- PNPM
- File System API
- Workspace Synchronization

---

## Current Capabilities

- User authentication
- Project management
- Builder workspace
- AI application planning
- AI architecture generation
- Multi-file frontend generation
- Component validation
- Automatic workspace creation
- Dependency installation
- Live preview
- Monaco code editing
- Automatic persistence

---

## Example Workflow

```text
Describe your application

↓

AI plans the project

↓

AI designs the architecture

↓

AI generates source code

↓

Validator checks components

↓

Workspace is created

↓

Dependencies are installed

↓

Application launches automatically

↓

User edits code

↓

Changes persist automatically
```

---

## Roadmap

### Completed

✅ Project Foundation
✅ Authentication
✅ Dashboard & Project Management
✅ Builder UI
✅ Runtime & Preview Engine
✅ AI Generation Engine

### In Progress

🚧 LangGraph Agent Orchestration
🚧 Automatic Build Error Repair
🚧 Streaming Generation
🚧 Dependency Repair
🚧 Incremental Generation

### Planned

⏳ Version History
⏳ ZIP Export
⏳ Deployment
⏳ Performance Optimization

---

## Prerequisites

Before running RendrAI, ensure you have the following installed:
- Node.js (v22.x or higher recommended)
- pnpm

---

## Installation

```bash
git clone https://github.com/AdityaV33/rendr-ai.git

cd rendr-ai

pnpm install

pnpm dev
```
*(Note: `pnpm dev` automatically boots both the client and server concurrently)*

---

## Environment Variables

You must create a `.env` file in the `apps/server` directory with the following variables. `MONGODB_URI` and `GEMINI_API_KEY` are required to boot the application.

```env
PORT=3000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

JWT_REFRESH_SECRET=your_refresh_secret

GEMINI_API_KEY=your_gemini_api_key
```

---

## Future Vision

RendrAI is being developed into a complete AI-powered frontend software engineering platform capable of autonomously planning, generating, validating, repairing, and iteratively improving frontend applications through agentic workflows.

---

## Project Status

Current Version:

**RendrAI v1**

Progress:

```text
████████████████████████████████████░░░░

Architecture           ✅
Authentication         ✅
Project Management     ✅
Builder UI             ✅
Runtime                ✅
AI Generation          ✅
LangGraph              🚧
Persistence            ⏳
Production Polish      ⏳
```

---

## License

MIT License
