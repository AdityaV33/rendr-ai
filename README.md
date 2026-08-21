# RendrAI

![Status](https://img.shields.io/badge/Phase_8_Complete-success)
![Version](https://img.shields.io/badge/version-v1.0-blue)
![Pipeline](https://img.shields.io/badge/Pipeline-Stable-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

> Autonomous AI application generation pipeline.

**RendrAI is an autonomous AI application generation platform that transforms a natural-language prompt into a complete React frontend application. Unlike traditional single-prompt generators, RendrAI uses deterministic architectural contracts, dependency-aware generation, staged validation, automated repair, and an interactive builder workspace to reduce hallucinations and cross-file inconsistencies.**

*Note: RendrAI is designed as a **local-only, Bring Your Own Key (BYOK)** development tool. Generated projects are executed entirely on your local machine. There is no cloud deployment infrastructure.*

## Why RendrAI?

Most AI code generators rely on a single LLM response.

RendrAI decomposes generation into specialized stages that independently plan, architect, generate, validate, and repair applications before presenting the application in an interactive live-preview workspace.

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
| Phase 8 – Builder UI, Persistence & Export | ✅ Complete |
| Phase 9 – Pipeline Polish & Optimization | ✅ Complete |

## Current Capabilities

### ✅ Completed
- Multi-stage AI pipeline
- Planner → Architect → Generator workflow
- Parallel dependency-aware generation (up to 4 concurrent AI generation tasks)
- Architecture Manifest
- Build validation
- Automatic repair engine
- Local workspace/build environment
- Live preview
- React application generation
- Type-safe code generation
- Builder Workspace
  - File explorer
  - Monaco editor
  - AI refinement
  - Live preview synchronization
  - Undo/revert
- Project persistence
- Export (.zip)
- Better streaming UI

### 🔮 Future
- Multi-page applications
- Next.js support
- Backend generation

## Engineering Highlights
- **Multi-stage AI generation pipeline**
- **Parallel dependency-aware code generation**
- **Deterministic architecture manifest**
- **Automated build validation**
- **Targeted TypeScript repair engine**
- **Local workspace/build environment**
- **Live application preview**
- **Prompt-driven architectural invariants**

---

## Architecture & Tech Stack

RendrAI operates across two distinct domains:

- **AI Pipeline (Server):** Node.js, Express, MongoDB, Custom Graph Orchestration, Google Gemini (Flash Lite).
- **Client Application:** React, Vite, TailwindCSS, Zustand, Monaco Editor.
- **Generated Applications:** React (Single-Page), Vite, TailwindCSS.

## Repository Structure

```text
rendr-ai/
├── apps/
│   ├── client/          # Builder UI
│   └── server/          # AI Pipeline
├── tools/               # Benchmarking tools
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
 Local Workspace
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
6. **Preview (`runtime-manager.service.ts`)**: The generated application is written to a local runtime workspace, validated with TypeScript, and launched in a Vite preview server managed by the server runtime.

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
| Runtime Execution | Native Local Processes |

Typical benchmark performance (approximate full generation):

| Stage | Average Time |
|--------|--------|
| Planner | ~4 s |
| Architect | ~4 s |
| Generator | 8–13 s |
| Build Validation & Repair | 35–65 s |
| **End-to-End** | **55–85 s** |


## Setup Instructions

### Prerequisites
- Node.js (v20+)
- pnpm (`npm install -g pnpm`)
- MongoDB (Local or Atlas URL)
- Google Gemini API Key

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
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
