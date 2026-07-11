# TrafficIQ — Master Implementation & Architecture Document
### IoT-Enabled Multi-Agent Reinforcement Learning Framework for Adaptive Traffic Signal Control
### Version 1.0 — 10-Day Intensive Build Plan

> **Project Start:** Day 1 | **Project End:** Day 10 | **Total Duration:** 10 Days
> **Backend Phase:** Days 1–5 (Infrastructure, ML Pipeline, APIs, IoT, Simulation)
> **Frontend Phase:** Days 6–10 (Dashboard, Maps, Real-Time UI, Admin, Deployment)

---

## 1. PROJECT BRANDING

| Field | Value |
|---|---|
| **Project Name** | TrafficIQ |
| **Website / App Name** | trafficiq.app |
| **Admin Dashboard Name** | TrafficIQ Command Center |
| **Operator Panel Name** | TrafficIQ Fleet Monitor |
| **Tagline** | *Smarter Cities. Faster Commutes. Intelligent Signals.* |
| **Theme** | Smart City + Real-Time AI + Data Visualization |

---

## 2. TECH STACK

| Layer | Technology |
|---|---|
| **Backend Runtime** | Node.js + Express.js |
| **ML / Simulation Engine** | Python (FastAPI microservice) |
| **RL Framework** | PyTorch + Custom QMIX Implementation |
| **Object Detection** | YOLOv8n (Ultralytics) |
| **Traffic Simulation** | SUMO (Simulation of Urban MObility) via TraCI API |
| **Graph Neural Network** | PyTorch Geometric (Graph Attention Network) |
| **Database** | MongoDB Atlas |
| **ORM** | Mongoose |
| **Cache / Pub-Sub** | Redis |
| **IoT Protocol** | MQTT (Mosquitto Broker) |
| **Real-Time** | Socket.IO |
| **Auth** | JWT + bcryptjs |
| **Frontend** | React (Vite) |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State Management** | Redux Toolkit |
| **Maps** | Leaflet.js + React-Leaflet |
| **Charts** | Recharts + D3.js |
| **API Client** | Axios |
| **Deployment — Backend** | Render / Railway |
| **Deployment — ML Service** | Render (Python) / HuggingFace Spaces |
| **Deployment — Frontend** | Vercel |
| **CI/CD** | GitHub Actions |

---

## 3. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TrafficIQ System                             │
├──────────────┬──────────────┬────────────────┬──────────┬───────────┤
│  IoT Edge    │  MQTT Broker │  Node.js API   │ Python   │  React    │
│  (YOLOv8n)  │  (Mosquitto) │  (Express)     │ ML/MARL  │  Frontend │
│  Camera Feed │              │                │ (FastAPI)│           │
└──────────────┴──────────────┴────────────────┴──────────┴───────────┘
        │               │              │              │
        └───────────────▼──────────────▼──────────────▼──────────────┐
                   ┌────────┐    ┌──────────┐    ┌──────────────┐    │
                   │  Redis │    │ MongoDB  │    │ SUMO Traffic │    │
                   │ Cache  │    │  Atlas   │    │  Simulator   │    │
                   └────────┘    └──────────┘    └──────────────┘    │
                                                                      │
                              Socket.IO ◄────────────────────────────┘
                              (Real-Time Updates to Frontend)
```

### 3.1 Data Flow Pipeline

```
Camera Feed → YOLOv8n Edge Detection → MQTT Publish
    → Node.js MQTT Subscriber → Redis Queue
    → Python MARL Engine (QMIX + GAT) → Signal Decision
    → MQTT Publish to Traffic Light Controller
    → MongoDB Log → Socket.IO → React Dashboard
```

---

## 4. DATABASE DESIGN

### 4.1 MongoDB Collections

#### `intersections` Collection
```json
{
  "_id": "ObjectId",
  "intersectionId": "string (unique, e.g. 'INT-001')",
  "name": "string (e.g. 'AH-GN Highway Junction 1')",
  "location": {
    "type": "Point",
    "coordinates": "[longitude, latitude]"
  },
  "highway": "string (e.g. 'Ahmedabad-Gandhinagar Highway')",
  "laneCount": "number",
  "phases": ["array of signal phase configs"],
  "isActive": "boolean, default: true",
  "edgeDeviceId": "string",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```
**Indexes:** `intersectionId` (unique), `location` (2dsphere), `isActive`

#### `trafficReadings` Collection
```json
{
  "_id": "ObjectId",
  "intersectionId": "string (ref: intersections)",
  "timestamp": "Date (required)",
  "vehicleCounts": {
    "cars": "number",
    "buses": "number",
    "trucks": "number",
    "motorcycles": "number",
    "total": "number"
  },
  "queueLength": "number (meters)",
  "averageWaitTime": "number (seconds)",
  "detectionConfidence": "number (0–1)",
  "inferenceTimeMs": "number"
}
```
**Indexes:** `intersectionId`, `timestamp` (TTL: 30 days), `{ intersectionId: 1, timestamp: -1 }`

#### `signalDecisions` Collection
```json
{
  "_id": "ObjectId",
  "intersectionId": "string",
  "timestamp": "Date",
  "activePhase": "number (0–3)",
  "greenDuration": "number (seconds)",
  "qmixReward": "number",
  "publicTransportPriority": "boolean",
  "busDetected": "boolean",
  "neighborStates": "object (from GAT)",
  "decisionSource": "enum: ['MARL', 'FALLBACK', 'MANUAL']"
}
```
**Indexes:** `intersectionId`, `timestamp`

#### `simulationRuns` Collection
```json
{
  "_id": "ObjectId",
  "runId": "string (unique)",
  "scenario": "string",
  "totalIntersections": "number",
  "duration": "number (simulation seconds)",
  "avgWaitTimeReduction": "number (%)",
  "avgTravelTimeReduction": "number (%)",
  "busSpeedImprovement": "number (%)",
  "comparedTo": "enum: ['fixed-time', 'DQN', 'actuated']",
  "status": "enum: ['running', 'completed', 'failed']",
  "startedAt": "Date",
  "completedAt": "Date"
}
```

#### `users` Collection
```json
{
  "_id": "ObjectId",
  "name": "string (required)",
  "email": "string (required, unique)",
  "password": "string (hashed)",
  "role": "enum: ['admin', 'operator', 'viewer'], default: 'viewer'",
  "assignedIntersections": ["ObjectId array"],
  "isActive": "boolean, default: true",
  "lastLogin": "Date",
  "createdAt": "Date"
}
```
**Indexes:** `email` (unique), `role`

#### `alerts` Collection
```json
{
  "_id": "ObjectId",
  "intersectionId": "string",
  "type": "enum: ['congestion', 'incident', 'device_offline', 'high_wait_time']",
  "severity": "enum: ['low', 'medium', 'high', 'critical']",
  "message": "string",
  "isResolved": "boolean, default: false",
  "resolvedBy": "ObjectId (user)",
  "createdAt": "Date",
  "resolvedAt": "Date"
}
```

#### `auditLogs` Collection
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "action": "string",
  "resource": "string",
  "details": "object",
  "ip": "string",
  "createdAt": "Date"
}
```

### 4.2 Relationships

```
intersections (1) ──── (many) trafficReadings
intersections (1) ──── (many) signalDecisions
intersections (1) ──── (many) alerts
users (many) ────────── (many) intersections [via assignedIntersections]
users (1) ───────────── (many) auditLogs
simulationRuns ────────── standalone (references intersectionId as string)
```

### 4.3 Redis Schema

| Key Pattern | Type | TTL | Purpose |
|---|---|---|---|
| `traffic:INT-001:latest` | Hash | 30s | Latest vehicle count per intersection |
| `signal:INT-001:phase` | String | 60s | Current active phase |
| `marl:state:INT-001` | JSON String | 10s | Current MARL observation vector |
| `alert:queue` | List | — | Unprocessed alert queue |
| `session:{userId}` | String | 7d | Auth session cache |
| `sim:run:{runId}:status` | String | 1h | Live simulation status |

---

## 5. ML / MARL ENGINE DESIGN (Python FastAPI Service)

### 5.1 MARL Architecture

```
Observation Space (per agent/intersection):
  - vehicle_count_per_lane: [4 values]
  - queue_length: [4 values]
  - current_phase: one-hot [4 values]
  - time_since_last_phase_change: [1 value]
  - neighbor_states (via GAT): [n_neighbors × 9 values]
  Total: ~50-dimensional vector per agent

Action Space:
  - 0: Keep current phase
  - 1: Switch to next phase
  (Discrete, binary per intersection)

Reward Function:
  r_t = -α(avg_wait_time) - β(queue_length) + γ(bus_priority_bonus) - δ(frequent_switching_penalty)
  α=0.6, β=0.3, γ=0.1 (dynamic), δ=0.05
```

### 5.2 QMIX Value Decomposition

```
Individual Q-networks → Q_i(o_i, a_i)
Mixing Network → Q_tot = f(Q_1, ..., Q_n, global_state)
Monotonicity constraint: ∂Q_tot/∂Q_i ≥ 0 for all i
Training: Centralized | Execution: Decentralized
```

### 5.3 Graph Attention Network

```
Nodes: Intersections
Edges: Spatial adjacency (within 500m)
Features: Current traffic state vector
Output: Context-aware neighbor embedding per node
Integration: Concatenated with local observation before Q-network input
```

### 5.4 YOLOv8n Edge Detection

```
Model: yolov8n.pt (nano — optimized for edge)
Classes: car, bus, truck, motorcycle
Input: 640×640 frames from RTSP/USB camera
Output: bounding boxes + class labels + confidence
Post-processing: Count per class, queue length estimation
Target: <50ms inference on Jetson Nano / CPU fallback
```

---

## 6. BACKEND DEVELOPMENT PLAN (Days 1–5)

### 6.1 Folder Structure

```
trafficiq-backend/
├── src/
│   ├── config/
│   │   ├── db.js                    # MongoDB connection
│   │   ├── redis.js                 # Redis client
│   │   ├── mqtt.js                  # MQTT broker connection
│   │   └── env.js                   # Environment validation
│   ├── models/
│   │   ├── Intersection.js
│   │   ├── TrafficReading.js
│   │   ├── SignalDecision.js
│   │   ├── SimulationRun.js
│   │   ├── User.js
│   │   ├── Alert.js
│   │   └── AuditLog.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── intersection.controller.js
│   │   ├── traffic.controller.js
│   │   ├── signal.controller.js
│   │   ├── simulation.controller.js
│   │   ├── alert.controller.js
│   │   ├── analytics.controller.js
│   │   └── admin.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── intersection.routes.js
│   │   ├── traffic.routes.js
│   │   ├── signal.routes.js
│   │   ├── simulation.routes.js
│   │   ├── alert.routes.js
│   │   ├── analytics.routes.js
│   │   └── admin.routes.js
│   ├── middleware/
│   │   ├── auth.middleware.js        # JWT verification
│   │   ├── role.middleware.js        # RBAC guard
│   │   ├── validate.middleware.js    # Joi/Zod validation
│   │   ├── rateLimiter.middleware.js # express-rate-limit
│   │   ├── audit.middleware.js       # Audit log writer
│   │   └── error.middleware.js       # Global error handler
│   ├── services/
│   │   ├── mqtt.service.js           # MQTT pub/sub logic
│   │   ├── socket.service.js         # Socket.IO emitters
│   │   ├── marl.service.js           # HTTP calls to Python ML service
│   │   ├── alert.service.js          # Alert generation logic
│   │   ├── redis.service.js          # Cache helpers
│   │   └── simulation.service.js     # SUMO run triggers
│   ├── utils/
│   │   ├── logger.js                 # Winston logger
│   │   ├── apiResponse.js            # Standardized response format
│   │   └── seedData.js               # Seed 12 intersections
│   └── app.js                        # Express app config
├── server.js                         # Entry point + Socket.IO init
├── .env
├── .env.example
└── package.json

trafficiq-ml/                         # Separate Python service
├── main.py                           # FastAPI app
├── models/
│   ├── qmix.py                       # QMIX network
│   ├── gat.py                        # Graph Attention Network
│   └── yolo_detector.py              # YOLOv8n wrapper
├── simulation/
│   ├── sumo_runner.py                # TraCI SUMO interface
│   └── scenario_builder.py           # Network XML generator
├── training/
│   ├── train_marl.py                 # Training loop
│   └── replay_buffer.py              # Experience replay
├── routes/
│   ├── predict.py                    # /predict endpoint
│   ├── simulate.py                   # /simulate endpoint
│   └── detect.py                     # /detect (YOLOv8) endpoint
├── requirements.txt
└── Dockerfile
```

---

### DAY 1 — Project Setup, Infrastructure & Core Models

**Objective:** Initialize both Node.js and Python services. Connect all infrastructure (MongoDB, Redis, MQTT). Build all Mongoose models with full validation.

#### Morning (4 hours) — Project Scaffolding

| Task | Details |
|---|---|
| Node.js Init | `npm init`, install: express, mongoose, redis, mqtt, socket.io, jsonwebtoken, bcryptjs, cors, helmet, express-rate-limit, joi, winston, dotenv |
| Python Init | `pip install fastapi uvicorn torch torchvision ultralytics torch-geometric sumo-tools paho-mqtt redis pymongo python-dotenv` |
| GitHub | Initialize repo, set up `.gitignore`, branch strategy: `main` / `dev` / `feature/*` |
| Folder Structure | Create complete folder tree for both `trafficiq-backend/` and `trafficiq-ml/` |
| Environment | `.env` files for both services; `env.js` validates all required variables on startup |

#### Afternoon (4 hours) — Infrastructure Connections

| Task | Details |
|---|---|
| MongoDB | `db.js` — connect with retry logic, connection pooling, event listeners (connected/error/disconnected) |
| Redis | `redis.js` — ioredis client with auto-reconnect; test SET/GET; wrap in `redis.service.js` helpers |
| MQTT | `mqtt.js` — connect to Mosquitto broker (local or cloud); subscribe to `traffic/+/reading` and `signal/+/command`; test pub/sub |
| Winston Logger | `logger.js` — file + console transport; separate error.log and combined.log; request logging middleware |
| Health Check | `GET /health` endpoint returning status of MongoDB, Redis, MQTT connections |

#### Evening (3 hours) — All Mongoose Models

| Task | Details |
|---|---|
| `Intersection.js` | GeoJSON Point location, phases array schema, full validation |
| `TrafficReading.js` | vehicleCounts sub-schema, TTL index on timestamp |
| `SignalDecision.js` | neighborStates as Mixed type, enum validation on decisionSource |
| `SimulationRun.js` | Status enum, performance metrics fields |
| `User.js` | Role enum, bcrypt pre-save hook for password hashing, comparePassword method |
| `Alert.js` | Severity enum, compound index on intersectionId + isResolved |
| `AuditLog.js` | Flexible `details` as Mixed type |
| Seed Script | `seedData.js` — insert 12 intersections along Ahmedabad-Gandhinagar Highway with real coordinates |

**Deliverables:** Both services start without errors; all 7 MongoDB models created with indexes; 12 intersections seeded; health endpoint returns green for all services
**Git Commit:** `chore(init): project scaffolding, infrastructure connections, all mongoose models, and seed data`

---

### DAY 2 — Authentication, MQTT Pipeline & Real-Time Core

**Objective:** Build the complete auth system with RBAC. Implement the full MQTT data ingestion pipeline. Set up Socket.IO for real-time broadcasting.

#### Morning (4 hours) — Authentication System

| Task | Details |
|---|---|
| `auth.controller.js` | `register`, `login`, `logout`, `refreshToken`, `getMe` |
| `auth.middleware.js` | Verify JWT; attach `req.user`; handle expired/invalid tokens with proper 401 responses |
| `role.middleware.js` | `requireRole(...roles)` — RBAC guard; `admin` > `operator` > `viewer` hierarchy |
| `auth.routes.js` | `POST /register`, `POST /login`, `POST /logout`, `GET /me`, `POST /refresh` |
| Password Security | bcrypt with salt rounds 12; password never returned in any response; password field `select: false` in schema |
| Token Strategy | Access token: 15min; Refresh token: 7d stored in httpOnly cookie |
| Validation | Joi schemas for all auth inputs; email format, password strength (min 8 chars, 1 number, 1 special) |

#### Afternoon (4 hours) — MQTT Ingestion Pipeline

| Task | Details |
|---|---|
| `mqtt.service.js` | Subscribe to `traffic/{intersectionId}/reading` — parse JSON payload, validate schema |
| Data Processing | On each MQTT message: (1) validate intersection exists, (2) save TrafficReading to MongoDB, (3) cache latest reading in Redis with 30s TTL, (4) check alert thresholds |
| Alert Triggers | Queue length > 50m → medium alert; wait time > 120s → high alert; no reading for 60s → device_offline critical alert |
| `alert.service.js` | `createAlert()` — dedup logic (don't create duplicate active alerts); `resolveAlert()` |
| MQTT Publisher | `mqtt.service.js` `publishSignalCommand(intersectionId, phase, duration)` → `signal/{intersectionId}/command` |
| IoT Simulator | Script `simulate_iot.js` — publishes fake vehicle count readings every 5 seconds for all 12 intersections (used for testing without real cameras) |

#### Evening (3 hours) — Socket.IO Real-Time Broadcasting

| Task | Details |
|---|---|
| `socket.service.js` | Initialize Socket.IO on Express server; namespace `/traffic` |
| Auth for Sockets | JWT middleware for socket handshake; attach user to socket |
| Rooms | Each intersection gets its own room `intersection:{id}`; clients join on connect |
| Emitter Functions | `emitTrafficUpdate(intersectionId, data)`, `emitSignalChange(intersectionId, phase)`, `emitAlert(alert)` |
| Integration | Call socket emitters from MQTT pipeline after saving to MongoDB |
| Testing | Postman WebSocket client test; verify real-time events fire on new MQTT messages |

**Deliverables:** Auth APIs tested in Postman; MQTT pipeline processes messages end-to-end; Socket.IO emits live updates; IoT simulator generates continuous test data
**Git Commit:** `feat(auth+mqtt+socket): complete auth system with RBAC, MQTT ingestion pipeline, and Socket.IO real-time broadcasting`

---

### DAY 3 — Core REST APIs (Intersections, Traffic, Signals)

**Objective:** Build all primary REST API endpoints for intersection management, traffic data querying, and signal control.

#### Morning (4 hours) — Intersection & Traffic APIs

| Task | Details |
|---|---|
| `intersection.controller.js` | `getAll`, `getById`, `create`, `update`, `delete`, `getNearby` (geospatial query) |
| `intersection.routes.js` | `GET /intersections` (with pagination, filter by highway/active), `GET /intersections/:id`, `POST`, `PUT`, `DELETE` (admin only), `GET /intersections/nearby?lat=&lng=&radius=` |
| `traffic.controller.js` | `getLatest` (from Redis cache), `getHistory` (paginated, time-range filter), `getStats` (avg wait time, peak hours), `getLive` (all 12 intersections current state) |
| `traffic.routes.js` | `GET /traffic/:intersectionId/latest`, `GET /traffic/:intersectionId/history?from=&to=&page=`, `GET /traffic/live`, `GET /traffic/:intersectionId/stats` |
| Geospatial | `getNearby` uses MongoDB `$nearSphere` with 2dsphere index; returns intersections within radius |
| Cache Layer | `getLatest` checks Redis first; fallback to MongoDB if cache miss; log cache hit/miss ratio |

#### Afternoon (4 hours) — Signal Control APIs

| Task | Details |
|---|---|
| `signal.controller.js` | `getCurrentPhase`, `manualOverride`, `setAutoMode`, `getPhaseHistory`, `getOptimalPhase` (calls ML service) |
| `signal.routes.js` | `GET /signals/:intersectionId/phase`, `POST /signals/:intersectionId/override` (operator+), `POST /signals/:intersectionId/auto`, `GET /signals/:intersectionId/history` |
| Manual Override | Validate phase (0–3) and duration (15–120s); publish MQTT command; log to SignalDecisions with `decisionSource: 'MANUAL'`; add audit log entry |
| Auto Mode | Triggers MARL service call on next cycle; logs `decisionSource: 'MARL'` |
| `marl.service.js` | `getOptimalPhase(intersectionId, currentState)` — HTTP POST to Python FastAPI `/predict`; handle timeout with FALLBACK |
| Fallback Logic | If ML service unreachable: use fixed-time schedule (30s cycles); log `decisionSource: 'FALLBACK'`; create low-severity alert |

#### Evening (3 hours) — Alert & User APIs

| Task | Details |
|---|---|
| `alert.controller.js` | `getAll` (filter: severity, type, resolved, intersectionId), `getById`, `resolve`, `getStats` |
| `alert.routes.js` | `GET /alerts`, `GET /alerts/:id`, `PATCH /alerts/:id/resolve` (operator+), `GET /alerts/stats` |
| `user.controller.js` | `getAll` (admin), `getById`, `update`, `deactivate`, `assignIntersections` |
| `user.routes.js` | `GET /users` (admin), `PUT /users/:id`, `PATCH /users/:id/deactivate`, `POST /users/:id/intersections` |
| Rate Limiting | `express-rate-limit`: 100 req/15min per IP on public routes; 500 req/15min on authenticated routes |
| Input Validation | Joi schemas for all POST/PUT bodies; `validate.middleware.js` wraps all routes |

**Deliverables:** All intersection, traffic, signal, alert, and user APIs tested in Postman; geospatial query returns correct nearby intersections; manual override publishes MQTT and saves to DB
**Git Commit:** `feat(apis): complete REST APIs for intersections, traffic, signals, alerts, and users with caching and validation`

---

### DAY 4 — Python ML Service (MARL + YOLOv8 + SUMO)

**Objective:** Build the complete Python FastAPI ML microservice including QMIX implementation, Graph Attention Network, YOLOv8n detection wrapper, and SUMO simulation interface.

#### Morning (4 hours) — FastAPI Setup & YOLOv8 Detection

| Task | Details |
|---|---|
| FastAPI App | `main.py` — app init, CORS, routers, startup/shutdown events; uvicorn server |
| `yolo_detector.py` | Load `yolov8n.pt`; `detect(frame_path_or_bytes)` returns `{cars, buses, trucks, motorcycles, total, queue_estimate_m, confidence, inference_ms}` |
| `/detect` endpoint | `POST /detect` — accepts image file upload or base64; runs YOLOv8n; returns detection dict |
| Queue Estimation | Linear regression model: queue_length_m = total_vehicles × avg_vehicle_length (4.5m) × density_factor |
| CPU Fallback | If GPU unavailable, run on CPU; log inference time; target <200ms on CPU |
| Test | Upload sample traffic image; verify vehicle counts and class breakdown in response |

#### Afternoon (4 hours) — QMIX + GAT Implementation

| Task | Details |
|---|---|
| `gat.py` | PyTorch Geometric `GATConv` layer; input: intersection state vectors + adjacency matrix of 12 intersections; output: 32-dim context embedding per node |
| `qmix.py` | Individual `AgentNetwork` (3-layer MLP: obs_dim → 128 → 64 → n_actions); `MixingNetwork` (hypernetwork conditioned on global state); `QMIXAgent` class with `select_action()` and `compute_loss()` |
| `replay_buffer.py` | Prioritized Experience Replay buffer; stores `(obs, actions, rewards, next_obs, done)` tuples; `sample(batch_size)` method |
| `train_marl.py` | Training loop: reset SUMO env → collect episodes → store in buffer → sample batch → QMIX loss → backprop; save checkpoint every 100 episodes |
| Pre-trained Weights | Provide a lightweight pre-trained checkpoint (100 episodes on Ahmedabad scenario) bundled with the repo |

#### Evening (3 hours) — SUMO Integration & /predict /simulate Endpoints

| Task | Details |
|---|---|
| `sumo_runner.py` | TraCI connection; `step()` method; `get_intersection_state(junction_id)` returns vehicle counts, queue lengths, wait times; `set_phase(junction_id, phase)` |
| `scenario_builder.py` | Generate SUMO `.net.xml` and `.rou.xml` for 12-intersection Ahmedabad-Gandhinagar corridor; realistic traffic demand (rush hour: 7–9am, 5–7pm) |
| `/predict` endpoint | `POST /predict` — accepts `{intersectionId, observation_vector, neighbor_states}`; loads QMIX; returns `{recommended_phase, green_duration, confidence, bus_priority}` |
| `/simulate` endpoint | `POST /simulate` — accepts `{scenario, duration, controller_type}`; runs SUMO with MARL or fixed-time; returns `{avg_wait_time, avg_travel_time, bus_speed, reward_history}` |
| Node.js Integration | Update `marl.service.js` to call `/predict` with full observation vector; parse response and publish MQTT command |

**Deliverables:** FastAPI service runs; `/detect` returns vehicle counts from image; `/predict` returns phase recommendation; `/simulate` completes a short run and returns metrics
**Git Commit:** `feat(ml-service): complete YOLOv8n detector, QMIX+GAT MARL engine, SUMO simulation interface, and FastAPI endpoints`

---

### DAY 5 — Analytics, Admin APIs, Testing & Backend Deployment

**Objective:** Build analytics and admin APIs. Write tests. Configure GitHub Actions. Deploy backend and ML service to production.

#### Morning (3 hours) — Analytics & Simulation APIs

| Task | Details |
|---|---|
| `analytics.controller.js` | `getOverview` (system-wide stats), `getIntersectionAnalytics` (per-intersection 24h breakdown), `getHourlyTrends` (wait time by hour of day), `getComparisonMetrics` (MARL vs fixed-time vs DQN) |
| `analytics.routes.js` | `GET /analytics/overview`, `GET /analytics/intersections/:id`, `GET /analytics/trends?period=24h|7d|30d`, `GET /analytics/comparison` |
| `simulation.controller.js` | `runSimulation` (calls Python /simulate), `getRunHistory`, `getRunById`, `getLatestResults` |
| `simulation.routes.js` | `POST /simulations/run`, `GET /simulations`, `GET /simulations/:runId`, `GET /simulations/latest` |
| Key Metrics | avg_wait_time_reduction (%), travel_time_reduction (%), bus_speed_improvement (%), MARL vs baseline |

#### Midday (3 hours) — Admin APIs & Audit Logs

| Task | Details |
|---|---|
| `admin.controller.js` | `getSystemHealth`, `getAuditLogs`, `getDashboardStats`, `resetIntersection`, `broadcastAlert` |
| `admin.routes.js` | All routes require `role: 'admin'`; `GET /admin/health`, `GET /admin/audit`, `GET /admin/stats`, `POST /admin/broadcast`, `POST /admin/intersections/:id/reset` |
| Audit Middleware | `audit.middleware.js` — auto-logs every mutating request (POST/PUT/DELETE/PATCH) with userId, action, resource, IP |
| `GET /admin/stats` | Returns: total intersections, active alerts, avg system wait time, top congested intersection, MARL uptime %, decisions per hour |

#### Afternoon (3 hours) — Testing & CI/CD

| Task | Details |
|---|---|
| Unit Tests | Jest: test all controllers with mocked MongoDB/Redis; test auth middleware; test MQTT message parsing |
| Integration Tests | Supertest: test all API routes end-to-end with test DB |
| ML Tests | pytest: test YOLOv8 output shape; test QMIX forward pass; test SUMO runner step |
| GitHub Actions | `.github/workflows/ci.yml` — on push to `dev`: lint (ESLint + Black) → test (Jest + pytest) → build |
| Deployment | Backend → Render (Node.js web service); ML service → Render (Python Docker); set all env vars in Render dashboard |
| Health Checks | Verify both deployed services return 200 on `/health`; test MQTT connectivity in production |

**Deliverables:** All APIs tested and documented in Postman; CI pipeline passes; both backend and ML service deployed and reachable via HTTPS
**Git Commit:** `feat(analytics+admin): analytics and admin APIs; chore: tests, CI/CD pipeline, and production deployment`

---

## 7. FRONTEND DEVELOPMENT PLAN (Days 6–10)

### 7.1 Folder Structure

```
trafficiq-frontend/
├── src/
│   ├── api/
│   │   ├── axiosInstance.js          # Axios with baseURL, interceptors, token refresh
│   │   ├── authAPI.js
│   │   ├── intersectionAPI.js
│   │   ├── trafficAPI.js
│   │   ├── signalAPI.js
│   │   ├── analyticsAPI.js
│   │   ├── simulationAPI.js
│   │   └── alertAPI.js
│   ├── store/
│   │   ├── index.js                  # Redux store config
│   │   ├── slices/
│   │   │   ├── authSlice.js
│   │   │   ├── intersectionSlice.js
│   │   │   ├── trafficSlice.js
│   │   │   ├── signalSlice.js
│   │   │   ├── alertSlice.js
│   │   │   ├── analyticsSlice.js
│   │   │   ├── simulationSlice.js
│   │   │   └── uiSlice.js
│   ├── hooks/
│   │   ├── useSocket.js              # Socket.IO connection hook
│   │   ├── useTrafficData.js         # Combined traffic + signal hook
│   │   ├── useAlerts.js              # Alert subscription hook
│   │   └── useAuth.js
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── PageWrapper.jsx
│   │   │   └── Footer.jsx
│   │   ├── map/
│   │   │   ├── TrafficMap.jsx        # Main Leaflet map
│   │   │   ├── IntersectionMarker.jsx
│   │   │   └── HeatmapLayer.jsx
│   │   ├── signals/
│   │   │   ├── SignalPhaseDisplay.jsx
│   │   │   ├── SignalOverridePanel.jsx
│   │   │   └── PhaseTimer.jsx
│   │   ├── charts/
│   │   │   ├── WaitTimeChart.jsx
│   │   │   ├── VehicleCountChart.jsx
│   │   │   ├── ComparisonChart.jsx
│   │   │   └── HeatmapChart.jsx
│   │   ├── alerts/
│   │   │   ├── AlertBadge.jsx
│   │   │   ├── AlertList.jsx
│   │   │   └── AlertToast.jsx
│   │   ├── simulation/
│   │   │   ├── SimulationPanel.jsx
│   │   │   └── SimulationResults.jsx
│   │   └── shared/
│   │       ├── StatCard.jsx
│   │       ├── LoadingSkeleton.jsx
│   │       ├── ErrorBoundary.jsx
│   │       └── Badge.jsx
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── dashboard/
│   │   │   └── Dashboard.jsx         # Main live overview
│   │   ├── intersections/
│   │   │   ├── IntersectionList.jsx
│   │   │   └── IntersectionDetail.jsx
│   │   ├── analytics/
│   │   │   └── Analytics.jsx
│   │   ├── simulation/
│   │   │   └── Simulation.jsx
│   │   ├── alerts/
│   │   │   └── Alerts.jsx
│   │   └── admin/
│   │       ├── AdminDashboard.jsx
│   │       ├── UsersPage.jsx
│   │       └── AuditLogsPage.jsx
│   ├── router/
│   │   └── AppRouter.jsx             # React Router v6 with protected routes
│   ├── utils/
│   │   ├── formatters.js             # Time, number, percentage formatters
│   │   └── constants.js
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── tailwind.config.js
├── vite.config.js
└── package.json
```

---

### DAY 6 — Frontend Setup, Auth UI & Layout System

**Objective:** Initialize React project. Build complete authentication UI with form validation. Build the shared layout system (sidebar, navbar).

#### Morning (3 hours) — Vite + Redux + Routing Setup

| Task | Details |
|---|---|
| Vite Init | `npm create vite@latest trafficiq-frontend -- --template react`; install all dependencies |
| Dependencies | `@reduxjs/toolkit react-redux react-router-dom axios socket.io-client leaflet react-leaflet recharts tailwindcss @shadcn/ui lucide-react react-hot-toast` |
| Tailwind | Configure `tailwind.config.js` with custom dark theme colors: deep navy (#0a0f1e), signal-green (#00ff88), signal-amber (#ffaa00), signal-red (#ff4444) |
| Redux Store | `store/index.js` — configure with RTK; add `redux-persist` for auth slice |
| `axiosInstance.js` | Base URL from `VITE_API_BASE_URL`; request interceptor adds JWT header; response interceptor handles 401 → auto refresh token → retry |
| `AppRouter.jsx` | React Router v6; `ProtectedRoute` component checks auth + role; lazy load admin pages |

#### Midday (3 hours) — Auth Pages

| Task | Details |
|---|---|
| `Login.jsx` | Dark themed form; email + password fields; "Remember me" checkbox; form validation (inline errors); `loginUser` thunk dispatch; redirect to dashboard on success |
| `Register.jsx` | Name, email, password, confirm password, role selector; Zod schema validation; `registerUser` thunk |
| `authSlice.js` | `loginUser` and `registerUser` async thunks; store token in localStorage + Redux state; `logout` clears state |
| `useAuth.js` | Hook exposing `user`, `isAuthenticated`, `role`, `logout` |
| Auth Guards | `ProtectedRoute` — redirect to /login if not authenticated; `RoleGuard` — redirect to /dashboard if insufficient role |
| Toast Notifications | `react-hot-toast` for success/error feedback on all auth actions |

#### Afternoon (3 hours) — Layout System

| Task | Details |
|---|---|
| `Sidebar.jsx` | Collapsible sidebar; role-aware nav items: Dashboard, Live Map, Intersections, Analytics, Simulation, Alerts (operator+), Admin (admin only); active route highlighting |
| `Navbar.jsx` | Logo + project name; global alert bell with unread count badge; user avatar menu (profile/logout); system status indicator (green dot = all systems online) |
| `PageWrapper.jsx` | Consistent page padding, max-width, page title prop |
| Dark Theme | Default dark mode with `uiSlice` toggle; CSS variables for all colors |
| Mobile Responsive | Sidebar collapses to hamburger menu on mobile; bottom navigation bar on small screens |
| `useSocket.js` | Connect to Socket.IO on mount; join user's assigned intersection rooms; expose `on(event, callback)` wrapper; auto-reconnect |

**Deliverables:** App boots; login/register fully functional with API; layout renders with role-aware navigation; Socket.IO connects on login
**Git Commit:** `feat(auth-layout): Vite setup, Redux auth, login/register pages with validation, responsive layout system`

---

### DAY 7 — Live Traffic Map & Real-Time Dashboard

**Objective:** Build the main live dashboard and the real-time traffic map — the core feature of the application.

#### Morning (4 hours) — Live Traffic Map

| Task | Details |
|---|---|
| `TrafficMap.jsx` | React-Leaflet `MapContainer`; dark tile layer (CartoDB Dark Matter); center on Ahmedabad-Gandhinagar Highway; zoom 13 |
| `IntersectionMarker.jsx` | Custom icon color-coded by congestion level: green (<30s wait), amber (30–90s), red (>90s); pulsing animation for active alerts |
| Marker Popups | Click intersection → popup shows: intersection name, current phase, vehicle count, avg wait time, active alerts count, "View Details" button |
| `HeatmapLayer.jsx` | Leaflet.heat plugin; heatmap overlay based on vehicle density per intersection; toggle button |
| Real-Time Updates | `useSocket.js` — on `traffic:update` event → dispatch to `trafficSlice` → map markers re-render with new colors |
| Map Controls | Layer toggle (satellite/dark/streets); heatmap toggle; fit-to-bounds button; locate me button |

#### Afternoon (4 hours) — Main Dashboard

| Task | Details |
|---|---|
| `Dashboard.jsx` | Full-page layout: top stats row + map (left 60%) + live feed panel (right 40%) |
| Stats Row | 4 `StatCard` components: Total Vehicles (live sum), Avg Wait Time (system-wide), Active Alerts count, MARL Decisions/hour |
| Live Feed Panel | Scrolling list of real-time events: signal changes, new alerts, vehicle count spikes; each item timestamped; color-coded by type |
| `useTrafficData.js` | Polls `GET /traffic/live` every 10s as fallback; merges with Socket.IO real-time updates in Redux |
| `AlertToast.jsx` | Auto-popup for new critical/high alerts via Socket.IO `alert:new` event; click to navigate to alert detail |
| Phase Timer | Per-intersection countdown timer showing seconds until next phase change; updates every second |

**Deliverables:** Live map shows all 12 intersections with color-coded congestion; clicking a marker shows real-time data; dashboard stats update live via Socket.IO
**Git Commit:** `feat(map+dashboard): real-time traffic map with color-coded markers, live dashboard with stats and event feed`

---

### DAY 8 — Intersection Detail, Signal Control & Analytics

**Objective:** Build the intersection detail page with signal control panel. Build the full analytics page with charts.

#### Morning (4 hours) — Intersection Pages

| Task | Details |
|---|---|
| `IntersectionList.jsx` | Table/grid toggle; search by name; filter by highway, status (active/offline), congestion level; pagination; each row shows live vehicle count and wait time |
| `IntersectionDetail.jsx` | Full-page detail: map mini-view (single marker), signal phase display, live metrics, historical charts, alert history, recent signal decisions |
| `SignalPhaseDisplay.jsx` | Visual traffic light component showing N/S/E/W phases; current active phase highlighted; animated green pulse |
| `PhaseTimer.jsx` | Circular countdown progress ring; seconds remaining for current phase; auto-resets on phase change via Socket.IO |
| `SignalOverridePanel.jsx` | Operator/Admin only: phase selector (0–3 radio buttons), duration slider (15–120s), "Override" button; confirmation modal; shows last 5 manual overrides |
| Auto/Manual Toggle | Switch between MARL auto-mode and manual override; persists state to API |

#### Afternoon (4 hours) — Analytics Page

| Task | Details |
|---|---|
| `Analytics.jsx` | Tabbed layout: Overview / Per-Intersection / Trends / Comparison |
| `WaitTimeChart.jsx` | Recharts LineChart; avg wait time over last 24h per intersection; multi-line with intersection color coding |
| `VehicleCountChart.jsx` | AreaChart showing vehicle volume by hour; stacked by vehicle type (car/bus/truck/motorcycle) |
| `ComparisonChart.jsx` | BarChart comparing MARL vs Fixed-Time vs DQN: wait time reduction %, travel time %, bus speed improvement % |
| `HeatmapChart.jsx` | D3 heatmap: hour-of-day (x) vs intersection (y) vs avg wait time (color intensity) |
| Redux | `analyticsSlice` — `fetchOverview`, `fetchTrends`, `fetchComparison`; loading/error states per query |
| Date Range Picker | Filter all charts by: Last 1h / 6h / 24h / 7d / Custom range |

**Deliverables:** Intersection list with live data; detail page with working signal override (operator+); analytics page with 4 chart types rendering real API data
**Git Commit:** `feat(intersections+analytics): intersection detail with signal control, analytics page with Recharts and D3 visualizations`

---

### DAY 9 — Simulation Page, Alerts Page & Admin Panel

**Objective:** Build the simulation runner UI. Build the alerts management page. Build the complete admin panel.

#### Morning (3 hours) — Simulation Page

| Task | Details |
|---|---|
| `Simulation.jsx` | Two-panel layout: config panel (left) + results panel (right) |
| `SimulationPanel.jsx` | Config form: scenario selector (Ahmedabad-GN Highway / Custom), duration (60–3600s), controller type (MARL / Fixed-Time / DQN / Actuated), number of intersections; "Run Simulation" button |
| Live Progress | While simulation runs: progress bar, elapsed time, current episode reward (via polling `GET /simulations/:runId`); cancel button |
| `SimulationResults.jsx` | After completion: results cards (wait time reduction %, travel time %, bus speed %), reward curve LineChart, comparison with baseline, "Download Report" button (CSV) |
| Run History | Table of past simulation runs; click to view results; delete run |
| `simulationSlice.js` | `runSimulation`, `pollSimulationStatus`, `fetchRunHistory`; polling every 3s while running |

#### Midday (2 hours) — Alerts Page

| Task | Details |
|---|---|
| `Alerts.jsx` | Split layout: filter sidebar + alert list |
| Filter Controls | Severity (all/low/medium/high/critical), Type, Intersection, Status (active/resolved), Date range |
| `AlertList.jsx` | Sortable table with columns: intersection, type, severity badge, message, created time, status; bulk resolve for admin |
| Alert Detail Drawer | Click alert → right-side drawer with full details, map showing intersection, resolve button, resolution notes |
| Real-Time | New alerts appear at top via Socket.IO `alert:new`; resolved alerts fade out; unread count in navbar updates |

#### Afternoon (4 hours) — Admin Panel

| Task | Details |
|---|---|
| `AdminDashboard.jsx` | System health grid: API status, ML service status, MQTT broker status, Redis status, MongoDB status; each with latency; auto-refresh every 30s |
| System Stats | Cards: total decisions today, MARL uptime %, fallback rate %, avg inference time (ms), top congested intersection |
| `UsersPage.jsx` | User management table: name, email, role badge, last login, active status; create/edit/deactivate user; role change with confirmation |
| `AuditLogsPage.jsx` | Paginated audit log table: timestamp, user, action, resource, IP; filter by user/action/date; export to CSV |
| Intersection Management | Admin can activate/deactivate intersections; reset to default phases; view assigned operators |
| `Broadcast Alert.jsx` | Admin can send system-wide alert (type: maintenance/emergency) to all connected Socket.IO clients |

**Deliverables:** Simulation page runs a job and displays results; alerts page fully functional with real-time updates; admin panel shows system health and full user/audit management
**Git Commit:** `feat(simulation+alerts+admin): simulation runner with live progress, alerts management, and complete admin panel`

---

### DAY 10 — Polish, Mobile Responsiveness, Testing & Full Deployment

**Objective:** Fix all bugs, ensure full mobile responsiveness, run E2E tests, deploy frontend to Vercel, finalize documentation.

#### Morning (3 hours) — UX Polish & Performance

| Task | Details |
|---|---|
| Loading States | `LoadingSkeleton.jsx` on all list/table/chart components; Suspense boundaries on all lazy-loaded pages |
| Error Boundaries | `ErrorBoundary.jsx` wrapping each major page section; friendly fallback UI with retry button |
| Empty States | Illustrated empty state components for: no alerts, no simulations run yet, no traffic data |
| Micro-animations | Framer Motion: page transition fade-in (200ms); stat cards count-up animation; signal phase transition glow effect |
| Performance | `React.memo` on `IntersectionMarker`, `StatCard`, `AlertList` items; `useMemo` for chart data transforms; virtualized lists for large alert/log tables |
| Bundle Size | Lazy load: admin pages, simulation page, D3 heatmap; analyze with `vite-bundle-visualizer` |

#### Midday (3 hours) — Mobile Responsiveness

| Task | Details |
|---|---|
| Breakpoints | Mobile (<640px), Tablet (640–1024px), Desktop (>1024px) |
| Dashboard Mobile | Map takes full width; stats scroll horizontally; live feed collapses to bottom sheet |
| Map Mobile | Touch-friendly markers (larger tap targets); swipe-up panel for intersection details instead of popup |
| Sidebar Mobile | Hamburger → overlay drawer; auto-close on route change |
| Tables Mobile | All tables collapse to card layout on mobile (responsive table pattern) |
| Signal Control | Override panel becomes full-screen modal on mobile |
| Test | Chrome DevTools device simulation for: iPhone 14, Samsung Galaxy S21, iPad Air |

#### Afternoon (4 hours) — Testing, Deployment & Documentation

| Task | Details |
|---|---|
| Unit Tests | React Testing Library: test `SignalPhaseDisplay`, `AlertBadge`, `StatCard`, `LoginPage` (form submit) |
| Integration Tests | Test `useSocket.js` hook with mock Socket.IO server; test `authSlice` reducers; test `trafficSlice` |
| E2E Tests | Playwright: login flow, view dashboard, view intersection detail, run simulation, resolve alert, admin user management |
| Frontend Deployment | `vercel deploy`; set `VITE_API_BASE_URL` to production backend; verify all API calls succeed |
| Full System Test | End-to-end: IoT simulator → MQTT → Node.js → ML service → Socket.IO → Frontend updates live |
| README | Final project README: project overview, architecture diagram, all deployment links, setup instructions, screenshots |
| Postman Collection | Export full API collection; publish to Postman Docs; add link to README |

**Deliverables:** Production app fully deployed; mobile responsive on all breakpoints; all tests passing; complete documentation published
**Git Commit:** `chore: final polish, mobile responsiveness, E2E tests, Vercel deployment, and complete documentation`

---

## 8. COMPLETE API REFERENCE

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Register new user |
| POST | `/api/v1/auth/login` | Public | Login, returns JWT |
| POST | `/api/v1/auth/logout` | User | Logout, clear refresh token |
| GET | `/api/v1/auth/me` | User | Get current user |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token |

### Intersections
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/intersections` | Viewer | List all (paginated, filtered) |
| GET | `/api/v1/intersections/:id` | Viewer | Get single intersection |
| POST | `/api/v1/intersections` | Admin | Create intersection |
| PUT | `/api/v1/intersections/:id` | Admin | Update intersection |
| DELETE | `/api/v1/intersections/:id` | Admin | Delete intersection |
| GET | `/api/v1/intersections/nearby` | Viewer | Geospatial query |

### Traffic
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/traffic/live` | Viewer | All intersections current state |
| GET | `/api/v1/traffic/:id/latest` | Viewer | Latest reading (Redis cached) |
| GET | `/api/v1/traffic/:id/history` | Viewer | Historical readings (paginated) |
| GET | `/api/v1/traffic/:id/stats` | Viewer | Aggregated statistics |

### Signals
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/signals/:id/phase` | Viewer | Current signal phase |
| POST | `/api/v1/signals/:id/override` | Operator | Manual phase override |
| POST | `/api/v1/signals/:id/auto` | Operator | Enable MARL auto mode |
| GET | `/api/v1/signals/:id/history` | Viewer | Phase decision history |

### Analytics
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/analytics/overview` | Viewer | System-wide KPIs |
| GET | `/api/v1/analytics/intersections/:id` | Viewer | Per-intersection breakdown |
| GET | `/api/v1/analytics/trends` | Viewer | Time-series trends |
| GET | `/api/v1/analytics/comparison` | Viewer | MARL vs baseline metrics |

### Simulation
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/simulations/run` | Operator | Trigger SUMO simulation |
| GET | `/api/v1/simulations` | Viewer | List all runs |
| GET | `/api/v1/simulations/:runId` | Viewer | Get run + results |
| GET | `/api/v1/simulations/latest` | Viewer | Most recent run |

### ML Service (Python FastAPI)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/predict` | Get optimal phase from QMIX |
| POST | `/simulate` | Run SUMO simulation |
| POST | `/detect` | YOLOv8n vehicle detection |
| GET | `/health` | ML service health check |

---

## 9. FULL DEPLOYMENT ARCHITECTURE

```
                    ┌──────────────┐
                    │    Vercel    │
                    │  (Frontend)  │
                    │ React + Vite │
                    └──────┬───────┘
                           │ HTTPS + WSS (Socket.IO)
                    ┌──────▼───────┐
                    │    Render    │
                    │  (Node.js)   │
                    │  Express API │
                    └──┬───────┬───┘
                       │       │
           ┌───────────▼─┐   ┌─▼──────────┐
           │  MongoDB    │   │   Render    │
           │  Atlas      │   │  (Python)   │
           │  (Database) │   │  FastAPI ML │
           └─────────────┘   └─────────────┘
                       │
                ┌──────▼──────┐
                │    Redis    │
                │  (Upstash)  │
                └─────────────┘

MQTT Broker: HiveMQ Cloud (free tier)
CI/CD: GitHub Actions → lint → test → deploy
```

---

## 10. ENVIRONMENT CONFIGURATION

```env
# trafficiq-backend/.env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/trafficiq
JWT_SECRET=<strong-random-secret-min-32-chars>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=<another-strong-secret>
REFRESH_TOKEN_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=trafficiq
MQTT_PASSWORD=<mqtt-password>
ML_SERVICE_URL=http://localhost:8000
CLIENT_URL=http://localhost:5173

# trafficiq-ml/.env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/trafficiq
REDIS_URL=redis://localhost:6379
MQTT_BROKER_URL=mqtt://localhost:1883
SUMO_HOME=/usr/share/sumo
MODEL_CHECKPOINT_PATH=./checkpoints/qmix_best.pt
YOLO_MODEL_PATH=./weights/yolov8n.pt

# trafficiq-frontend/.env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_NAME=TrafficIQ
VITE_MAP_TILE_URL=https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
```

---

## 11. KEY PERFORMANCE TARGETS

| Metric | Target | Baseline (Fixed-Time) |
|---|---|---|
| Avg Wait Time Reduction | ≥ 44% | — |
| Travel Time Reduction | ≥ 22% | — |
| vs Single-Agent DQN | ≥ 18% better | — |
| Bus Speed Improvement | ≥ 28% | — |
| YOLOv8n mAP | ≥ 94.2% | — |
| Edge Inference Time | < 50ms (GPU) / <200ms (CPU) | — |
| API Response Time | < 200ms (p95) | — |
| Socket.IO Latency | < 100ms | — |
| Frontend Bundle Size | < 500KB gzipped | — |
| Lighthouse Score | > 90 (Performance + Accessibility) | — |

---

## 12. DAY-BY-DAY SUMMARY

| Day | Focus | Key Deliverable |
|---|---|---|
| 1 | Setup + Models + Infrastructure | Both services running; all DB models; 12 intersections seeded |
| 2 | Auth + MQTT + Socket.IO | Full auth with RBAC; real-time IoT pipeline; live Socket.IO updates |
| 3 | Core REST APIs | All intersection, traffic, signal, alert APIs tested in Postman |
| 4 | Python ML Service | YOLOv8n + QMIX + GAT + SUMO integrated; /predict working |
| 5 | Analytics + Admin + Deploy | All APIs complete; tests passing; backend deployed to Render |
| 6 | Frontend Setup + Auth + Layout | React app with auth; responsive layout; Socket.IO connected |
| 7 | Live Map + Dashboard | Real-time traffic map + live dashboard with Socket.IO updates |
| 8 | Intersection Detail + Analytics | Signal override UI; 4 chart types with real data |
| 9 | Simulation + Alerts + Admin | Full simulation UI; alert management; admin panel |
| 10 | Polish + Mobile + Deploy | Mobile-responsive; E2E tests; Vercel deployed; docs complete |

---

*Built with purpose. Trained on data. Optimized for cities.*
*TrafficIQ — because every second at a red light is a second lost.*
