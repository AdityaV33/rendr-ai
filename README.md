# RendrAI

RendrAI is an AI-powered React frontend application builder that takes a natural-language prompt and transforms it into a structured, generated, validated, repairable, and editable application.

Unlike first-generation "one-shot" AI code generators that attempt to stream an entire application into a single context window, RendrAI operates as an autonomous virtual engineering team. It utilizes a deterministic pipeline to **plan, architect, generate, validate, and repair** code before presenting it to the user.

### The Architectural Philosophy
RendrAI is built on the premise that LLMs are bad at holding massive global state but exceptional at generating small, highly constrained files. The pipeline forces the AI through a strict progression:

`Natural language → planning → architecture → manifest → parallel generation → build validation → diagnostic repair → runtime preview → editing/refinement → persistence`

By defining the entire "Architecture Manifest" upfront (a strict JSON contract of what files exist, what they export, and what components they consume), RendrAI can generate the actual application code in massive parallel batches without hallucinating dependencies.

---

## 2. Key Features

- **Natural-Language Generation:** Prompt-to-application orchestration.
- **Deterministic Architecture Design:** Planners and Architects design the system before generation begins.
- **Architecture Manifest:** A strict JSON contract that prevents the generator from hallucinating arbitrary files.
- **Parallel Generation (GeneratorV2):** Files are batched based on dependency trees and generated concurrently across multiple model instances.
- **Model Scheduling:** Intelligent round-robin scheduling across Gemini models with built-in 429/503 cooldown handling and fallback strategies.
- **Closed-Loop Validation:** Automatically syncs generated code to a local workspace and runs `tsc` to find type errors.
- **AI Repair Engine:** Parses TypeScript compiler diagnostics and forces the AI to patch broken files before the user ever sees them.
- **Builder Workspace:** A complete browser-based IDE using the Monaco Editor (`@monaco-editor/react`).
- **Live Preview:** Dynamically spawned Vite dev servers with proxy-based iframe injection.
- **Incremental Refinement:** Ask the AI to modify the working application. Refinements are generated into a `pendingProject`, verified by the repair engine, and presented with an option to Apply or Undo.
- **ZIP Export:** Download the fully generated, ejection-ready Vite source code.

---

## 3. End-to-End Workflow

The complete lifecycle of a RendrAI project follows a strict pipeline:

1. **User Prompt:** Submitted via the React client.
2. **Planner (Groq):** Analyzes the prompt and outputs a structured `ProjectPlan` containing required features, routes, and state. Implemented in `planner.service.ts`.
3. **Architect (Gemini):** Consumes the `ProjectPlan` and outputs an `ArchitectureManifest`. This defines every file, component, interface, and dependency constraint in the application. Implemented in `architect.service.ts`.
4. **GeneratorV2 (Gemini):** Takes the manifest, chunks it into parallel dependency batches, and invokes multiple AI models concurrently to generate the React/TypeScript source code. Implemented in `generator-v2.service.ts`.
5. **Workspace Synchronization:** AI files are merged with a base React/Vite template and written to a physical disk directory (`/tmp/rendrai-workspaces`).
6. **Validation / Build:** The backend runs `tsc --noEmit` on the generated workspace.
7. **Repair Engine:** If validation fails, `diagnostic-parser.ts` extracts the errors and `repair-engine.service.ts` forces the AI to fix the specific broken files. This loops until the build passes or a retry limit is hit.
8. **Preview:** `dev-server.manager.ts` spawns a background Vite process on a dynamically allocated port.
9. **Builder Workspace:** The React frontend transitions to the Builder UI, displaying the File Tree, Monaco Editor, and Vite Preview.
10. **Refinement:** The user asks for a change (e.g., "Make the button red"). The `RefinementPlanner` selects only `Button.tsx`. The `RefinementGenerator` rewrites it, and the repair loop runs on a `pendingProject` shadow workspace.
11. **Apply / Undo:** The user previews the pending changes and can merge them into the canonical project history.

---

## 4. AI Architecture

### Planner
- **Purpose:** Extracts product requirements and translates natural language into technical features.
- **Input:** User text prompt.
- **Output:** Structured `ProjectPlan` JSON.
- **Provider:** Groq (for extremely fast time-to-first-byte planning).

### Architect
- **Purpose:** Translates the `ProjectPlan` into an explicit technical blueprint.
- **Output:** The `ArchitectureManifest`.
- **Behavior:** The architect is constrained by complexity checks. If the generated manifest fails Zod schema validation, it utilizes a dual-layer repair strategy (deterministic patching followed by targeted LLM reprompting).

### Architecture Manifest
The most critical architectural concept in RendrAI. It is a closed-world contract.
- It dictates exact file paths (e.g., `src/components/Header.tsx`).
- It defines component props and export signatures.
- **Rule:** The Generator is strictly prohibited from inventing files outside the manifest. If a generated file references an unmanifested file, the build validation will catch it and force a repair.

### GeneratorV2
- **Process:** Replaces sequential generation by analyzing the manifest's dependency graph. Files with no internal dependencies are generated first.
- **Parallelism:** Processes files in concurrent batches bounded by `MAX_PARALLEL_GENERATIONS` and the health of the model pool.
- **Contracts:** Every prompt injects the exact Architect contract for that specific file to ensure the AI doesn't hallucinate arbitrary props.

---

## 5. Model Scheduler

RendrAI uses a custom `ModelSchedulerService` (`apps/server/src/modules/ai/scheduler/model-scheduler.service.ts`) to manage AI API quotas and reliability.

**Configured Providers:**
- **Gemini:** Used for complex structured reasoning (Architect, Generator, Repair). Configured via `GEMINI_MODELS` environment variable.
- **Groq:** Used for rapid feature extraction (Planner). Configured via `GROQ_MODELS`.

**Scheduling Behavior:**
- **Concurrency Tracking:** The scheduler tracks active, in-flight requests per model.
- **Round-Robin:** Requests are distributed across the available model pool.
- **Cooldowns:** 
  - On `HTTP 429` (Rate Limit), the specific model is placed on a 30-second cooldown.
  - On `HTTP 503` (Overloaded), the model is placed on a 5-second cooldown.
- **Fallback:** If a generation request fails, the scheduler transparently redirects the retry to the next available healthy model.

---

## 6. Validation and Repair

RendrAI treats AI generation as inherently faulty. Code is not trusted until it compiles.

**The Sequence:**
1. Generate batch.
2. Sync to physical `/tmp` disk.
3. Run `tsc --noEmit`.
4. Parse diagnostics (`TS2304`, `TS2322`).
5. Send actionable errors + the broken file to the **Repair Engine**.
6. Generate file patch.
7. Rebuild.

The **Repair Engine** is highly targeted. It ignores deep `node_modules` errors and only attempts to fix files owned by the AI, leaving static template files (`index.html`, `vite.config.ts`) untouched.

---

## 7. Runtime / Preview Architecture

Generated applications are executed on the host machine. (Docker integration is deferred for future v2 releases).

- **Workspace:** `runtime-manager.service.ts` creates isolated directories in `/tmp/rendrai-workspaces/<id>`.
- **Templates:** A base React/Vite boilerplate (`apps/server/templates/react`) is copied in, and `pnpm install` is executed natively.
- **Preview Server:** `dev-server.manager.ts` spawns `vite` using the `cross-spawn` library.
- **Process Management:** To prevent zombie Vite processes, the system uses the `tree-kill` library to send `SIGTERM` signals to the entire process group when a project is closed.
- **Ports:** `port.service.ts` dynamically allocates ports starting from `45000` and actively probes them for `EADDRINUSE` conflicts before releasing them back to the pool.

---

## 8. Builder Workspace

The frontend Builder (`apps/client/src/features/builder`) is the primary user interface.

- **State:** Managed by `builder.store.ts` (Zustand). It tracks the `currentProject`, `pendingProject`, and guards against UI race conditions during long-polling.
- **Editor:** Uses `@monaco-editor/react`. Files are mounted using `file:///` URIs to allow Monaco's internal language server to correctly resolve relative imports between open tabs.
- **Autosave:** Edits in Monaco trigger an `onChange` handler with a 1000ms debounce, saving the file to the backend physical disk and instantly triggering a Vite HMR update in the iframe preview.
- **File Management:** Files can be created, renamed, and deleted, with automatic cleanup of stale editor tabs.

---

## 9. AI Refinement

Refinement allows users to iteratively modify the application via natural language *without* destroying the working base.

1. **Refinement Planner:** Identifies which specific files need changing based on the prompt.
2. **Targeted Generation:** *Only* those files are sent to the Generator.
3. **Pending Workspace:** Changes are written to a `pendingProject` shadow state.
4. **Repair:** The shadow state is validated and repaired if necessary.
5. **Apply/Undo:** The user previews the changes in the Vite iframe and clicks "Apply" to commit them to the canonical project tree.

**Important Architectural Note:** 
Refinement generation intentionally uses raw Markdown text generation (`generateText`) rather than structured JSON. JSON parsers flatten multiline strings, which historically corrupted source code indentation and formatting. Generating raw text and stripping Markdown fences (`cleanRawOutput`) perfectly preserves formatting.

---

## 10. Persistence

The state is persisted in MongoDB (via Mongoose).

- **ProjectModel:** Stores the manifest, file arrays (path + content), status flags (`generating`, `refining`, `ready`), and historical snapshots.
- **Apply/Undo:** When "Apply" is clicked, `pendingProject` is merged into `generatedProject`, and a snapshot of the previous state is pushed to a `history` array, allowing instant rollbacks.

---

## 11. ZIP Export

Triggered via the dashboard or builder UI, the Export module collects the canonical `generatedProject.files`, merges them with the base template, filters out transient runtime directories (`node_modules`), and streams a compressed ZIP archive to the client using `archiver`.

---

## 12. Frontend Architecture

```text
apps/client/
├── src/
│   ├── features/
│   │   ├── builder/      # Monaco editor, file tree, refinement UI, Zustand store
│   │   ├── dashboard/    # Project listing
│   │   └── landing/      # Marketing homepage
│   ├── lib/              # Axios interceptors, JWT token manager
│   ├── router/           # React Router DOM
│   └── index.css         # Tailwind v4 configuration
```
**Tech Stack:** React 19, Vite, Tailwind v4, Zustand, Monaco, Framer Motion, Axios.

---

## 13. Backend Architecture

```text
apps/server/
├── src/
│   ├── modules/
│   │   ├── ai/           # Custom orchestration pipeline, Planner, Architect, Generator, Repair
│   │   ├── auth/         # JWT authentication controllers/services
│   │   ├── projects/     # MongoDB Mongoose models and CRUD
│   │   ├── runtime/      # Process management, workspace sync, port allocation
│   │   └── middleware/   # Express error handling and JWT verification
│   ├── config/           # Environment validation (Zod) and MongoDB connection
│   └── app.ts            # Express application bootstrap
├── templates/
│   └── react/            # The base Vite boilerplate copied into generated workspaces
```
**Tech Stack:** Node.js, Express, TypeScript, Mongoose, Zod.

---

## 14. Data Flow & File Interconnections

**Workflow Example: Generation Pipeline**
1. `project.controller.ts` receives the HTTP request.
2. `project.service.ts` creates the MongoDB record.
3. `ai.service.ts` triggers the custom state machine orchestrator.
4. `planner.service.ts` calls Groq and returns a `ProjectPlan`.
5. `architect.service.ts` calls Gemini and returns an `ArchitectureManifest`.
6. `generator-v2.service.ts` reads the manifest and calls Gemini in parallel batches.
7. `sanity-gate.service.ts` invokes the `tsc` compiler on the files.
8. `repair-engine.service.ts` fixes errors and loops back to the gate.
9. `dev-server.manager.ts` spawns Vite.
10. `builder.store.ts` polls the backend, sees `status: ready`, and renders the IDE.

---

## 15. Database & Authentication

- **Database:** MongoDB Atlas. Projects contain embedded subdocuments for files, historical snapshots, and pending refinements.
- **Authentication:** `auth.controller.ts` issues a short-lived JSON `accessToken` and a long-lived `refreshToken` via a Secure, `httpOnly` cookie.
- **Security:** `apps/client/src/lib/axios.ts` intercepts `401 Unauthorized` responses and automatically hits the `/refresh` endpoint to seamlessly rotate tokens in the background. Passwords are mathematically hashed with `bcrypt`.

---

## 16. Current Supported Scope

**SUPPORTED:**
- React (Vite) frontend applications.
- TypeScript / TSX.
- AI Generation, AI Refinement, and Manual Monaco Editing.
- Background compiler repair.
- Local preview runtime.
- ZIP export.

**NOT SUPPORTED / DEFERRED IN V1:**
- Next.js SSR applications.
- Vanilla JS.
- Backend/Database generation.
- Production one-click hosting/deployment (Local development only).
- Firecracker/MicroVM sandboxing (Workspaces run natively on the host).

---

## 17. Setup & Installation

### Requirements
- Node.js 20+
- pnpm 9+
- MongoDB instance (Atlas or local)
- Gemini API Key
- Groq API Key

### Environment Variables (`apps/server/.env`)
Create a `.env` file based on `.env.example`:
```env
PORT=3000
MONGODB_URI=<your-mongodb-connection-string>
CLIENT_ORIGIN=http://localhost:5173
JWT_ACCESS_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODELS=models/gemini-3.5-flash-lite,models/gemini-3.1-flash-lite,models/gemini-flash-lite-latest
GENERATOR_VERSION=v2
MAX_PARALLEL_GENERATIONS=4
GROQ_API_KEY=<your-groq-api-key>
GROQ_MODELS=qwen/qwen3.6-27b,openai/gpt-oss-20b,groq/compound
```

### Installation
```bash
# Install all dependencies across the monorepo
pnpm install

# Start both the frontend and backend concurrently
pnpm dev
```

The Builder UI will be available at `http://localhost:5173`.

---

## 18. Benchmarks

**Observed Pipeline Timings (Average Runs):**
- **Main Generation:** < 2 minutes (Full parallel pipeline from prompt to running Vite server)
- **AI Refinement:** < 30 seconds (Targeted planning, single-file generation, and hot-reload)
- **Repair Cycle:** ~15 seconds per compiler failure (if required)

*(Note: These benchmarks depend on current Gemini/Groq API latencies and are observed from actual repository test runs.)*

---

## 19. Troubleshooting

- **Zombie Vite Processes (EADDRINUSE):** If you manually kill the server using `SIGKILL` instead of `SIGTERM`, Vite instances may linger in the background. Kill them manually: `pkill -f vite`.
- **429 Quota Exceeded:** Ensure you have multiple Gemini models listed in `GEMINI_MODELS` to allow the `ModelScheduler` to round-robin and bypass individual endpoint limits.
- **MongoDB VersionErrors:** The backend handles Mongoose race conditions using `$set` and `$push` operators, but if you manually edit the database while an AI pipeline is running, it may overwrite state.

---

## 20. Future Roadmap

- Next.js SSR Template Integration.
- Backend Generation (Express/Postgres templates).
- Docker or Firecracker MicroVM integration to securely sandbox generated runtime environments.
- WebWorker-based semantic validation for Monaco to provide cross-file intellisense.

---

## 21. Project Status & License

**Status:** RendrAI v1 is a completed, locally runnable React-focused AI frontend application builder.

**License:** MIT License. See `LICENSE` for details.
