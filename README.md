# RendrAI

![Status](https://img.shields.io/badge/Phase_7_Complete-success)
![Version](https://img.shields.io/badge/version-v1.0-blue)
![Pipeline](https://img.shields.io/badge/Pipeline-Stable-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

> Autonomous AI application generation pipeline.

RendrAI is an autonomous AI application generation platform that transforms a natural-language prompt into a complete, production-ready React frontend application. Unlike traditional single-prompt generators, RendrAI uses deterministic architectural contracts and staged validation to reduce hallucinations and cross-file inconsistencies.

## Why RendrAI?

Most AI code generators rely on a single LLM response.

RendrAI decomposes generation into specialized stages that independently plan, architect, generate, validate, and repair applications before presenting a live preview.

## Project Roadmap

| Phase | Status |
|--------|--------|
| Phase 0 – Architecture | ✅ Complete |
| Phase 1 – Setup | ✅ Complete |
| Phase 2 – Authentication | ✅ Complete |
| Phase 3 – Dashboard | ✅ Complete |
| Phase 4 – Builder Foundation | ✅ Complete |
| Phase 5 – AI Pipeline | ✅ Complete |
| Phase 6 – Runtime & Preview | ✅ Complete |
| Phase 7 – Validation & Repair | ✅ Complete |
| Phase 8 – Builder UI, Persistence & Export | 🚧 In Progress |
| Phase 9 – Deployment & Polish | ⏳ Planned |

## Current Capabilities

### ✅ Completed
- Multi-stage AI pipeline
- Planner → Architect → Generator workflow
- Parallel dependency-aware generation (up to 4 concurrent AI generation tasks)
- Architecture Manifest
- Build validation
- Automatic repair engine
- Docker runtime
- Live preview
- React application generation
- Type-safe code generation

### 🚧 Next
- Builder Workspace
- Project persistence
- Export (.zip)
- Project refinement
- Better streaming UI

### 🔮 Future
- Next.js support
- Backend generation
- Multi-page applications
- One-click deployment

## Engineering Highlights
- **Multi-stage AI generation pipeline**
- **Parallel dependency-aware code generation**
- **Deterministic architecture manifest**
- **Automated build validation**
- **Targeted TypeScript repair engine**
- **Docker sandbox execution**
- **Live application preview**
- **Prompt-driven architectural invariants**

---

## Architecture & Tech Stack

RendrAI operates across two distinct domains:

- **AI Pipeline (Server):** Node.js, Express, MongoDB, LangGraph orchestration, Google Gemini (Flash Lite).
- **Client Application:** React, Vite, TailwindCSS, Zustand, Monaco Editor.
- **Generated Applications:** React (Single-Page), Vite, TailwindCSS.

## Repository Structure

```text
rendr-ai/
├── apps/
│   ├── client/          # Builder UI
│   └── server/          # AI Pipeline
├── tools/               # Benchmarking tools
├── archive/             # Historical metrics
└── README.md
```

## AI Pipeline Flow

```text
User Prompt
     │
     ▼
 Planner
     │
     ▼
 Architect
     │
     ▼
 Architecture Manifest
     │
     ▼
 Parallel Generator
     │
     ▼
 Validator (tsc)
     │
     ▼
 Repair Engine
     │
     ▼
 Docker Runtime
     │
     ▼
 Live Preview
```

The AI generation is broken down into a strict, verifiable pipeline to enforce architectural invariants:

1. **Planner (`planner.prompt.ts`)**: Ingests the user's text prompt and produces a high-level `ProjectPlan`. It defines the core data entities and identifies the exact interactive workflows required for a complete Minimum Viable Product (MVP).
2. **Architect (`architect.prompt.ts`)**: Consumes the `ProjectPlan` and produces a rigorous `ArchitectureManifest`. This acts as an immutable ABI (Application Binary Interface) for the project. 
3. **Generator (`generator-v2.service.ts`)**: Iterates through the manifest and writes the actual React/TypeScript code for each file. Files are generated in dependency-aware layers, allowing independent components to be generated concurrently for significantly faster project synthesis. The Generator is strictly forbidden from inventing APIs, renaming fields, inferring types, or outputting placeholder UIs. It must perfectly adhere to the contracts defined by the Architect.
4. **Validator (`gate-runner.node.ts`)**: Runs `tsc` to verify that the generated code is syntactically correct and adheres to the architecture.
5. **Repair Engine (`repair.prompt.ts`)**: If the Validator finds TypeScript errors, the Repair Engine analyzes the `tsc` diagnostic output. It reconciles conflicting files back to the immutable `ArchitectureManifest` and issues targeted file-level repairs until the application successfully compiles or the repair budget is exhausted.
6. **Preview (`runtime-manager.service.ts`)**: The generated application is built inside an isolated Docker workspace before being validated and launched in a Vite preview server.

## Deterministic Architecture Manifest
Every generation is governed by a canonical Architecture Manifest. The manifest defines:
- Project file structure
- Canonical data models
- Exported APIs
- Function signatures
- Behavioral contracts
- Semantic meaning of fields and enums

All downstream pipeline stages are required to obey this manifest, preventing API hallucinations and cross-file inconsistencies.

## Architectural Invariants
The pipeline enforces strict generation invariants including:
- Closed-world generation
- Data model immutability
- Semantic contracts
- TypeScript type/value separation
- Function signature reconciliation
- Deterministic KPI computation
- Context ownership rules
- Manifest-driven repairs

## Pipeline Statistics & Performance

| Metric | Value |
|---------|------:|
| AI Pipeline Stages | 6 |
| Parallel Generation Layers | 3 |
| Typical AI Files | 18–20 |
| Typical API Calls | 6–8 |
| Max Repair Attempts | 3 |
| Build Validator | TypeScript (`tsc`) |
| Runtime Isolation | Docker |

Typical benchmark performance:

| Stage | Average Time |
|--------|--------|
| Planner | ~4 s |
| Architect | ~4 s |
| Generator | 8–13 s |
| Build Validation & Repair | 35–65 s |
| **End-to-End** | **55–85 s** |

## Screenshots

*(Screenshots of the Dashboard, Builder, Generation Progress, Preview, and Generated Application will be added here)*

## Setup Instructions

### Prerequisites
- Node.js (v20+)
- pnpm (`npm install -g pnpm`)
- MongoDB (Local or Atlas URL)
- Google Gemini API Key
- Docker (for isolated workspace generation)

### Installation

1. Clone the repository and install dependencies:
```bash
pnpm install
```

2. Configure the server environment:
Create a `.env` file in `apps/server/` based on `.env.example`:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/rendrai
GEMINI_API_KEY=your_api_key_here
```

### Development

Start both the client and server concurrently:
```bash
pnpm dev
```

Run TypeScript compilation checks across the workspace:
```bash
pnpm typecheck
```

## Current Limitations

- React SPA generation only
- No backend/API generation yet
- No Next.js generation yet
- Export and Builder UI arrive in Phase 8

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
