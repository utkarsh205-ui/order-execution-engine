# Order Execution Engine (Backend Task)

This project is a high-performance backend service that simulates a cryptocurrency order execution engine. It's built with Node.js, Fastify, and BullMQ, and it's designed to process concurrent trade orders with real-time WebSocket status updates.

The engine features a DEX router that compares prices between (mocked) Raydium and Meteora pools [cite: 13, 48] and executes the trade on the most profitable venue.



---

## 🚀 Key Features

* [cite_start]**DEX Routing:** Automatically queries mock endpoints for Raydium and Meteora and routes the order to the one with the best price[cite: 13, 48].
* [cite_start]**Real-time Updates:** Uses a WebSocket stream to send live status updates for the entire order lifecycle (e.g., `pending`, `routing`, `confirmed`, `failed`) [cite: 15-21].
* [cite_start]**Concurrent Processing:** Uses a **BullMQ** + **Redis** queue system to manage and process up to 10 orders at once[cite: 57, 65].
* [cite_start]**Persistent History:** Saves all final "confirmed" and "failed" orders to a **PostgreSQL** database for post-mortem analysis[cite: 66, 60].
* [cite_start]**Tested Components:** Includes a suite of **11+ unit tests** built with Jest, covering core component logic and the WebSocket connection lifecycle[cite: 86].

---

## 🛠️ Tech Stack

* **Server:** Node.js, TypeScript, Fastify
* **WebSocket:** `@fastify/websocket`
* [cite_start]**Queue System:** BullMQ (to manage concurrent orders) [cite: 65]
* **Databases:**
    * [cite_start]**Redis:** Powers the BullMQ queue [cite: 65]
    * [cite_start]**PostgreSQL:** Stores the final order history [cite: 66]
* **Testing:** Jest & ts-jest

---

## 🧠 Design Decisions

As per the project requirements, here are the design choices made:

### 1. Order Type: Market Order

[cite_start]I chose to implement the **Market Order** (Immediate execution at current price)[cite: 44].

* **Why:** This order type is the most straightforward ("execute immediately at the current price"). [cite_start]It allowed me to focus on the most complex parts of the task: the DEX routing logic [cite: 47][cite_start], the queue concurrency [cite: 55][cite_start], and the HTTP-to-WebSocket communication pattern[cite: 51]. This flow serves as the core foundation for all other order types.

### 2. Implementation: Mock (Recommended)

[cite_start]I chose the **Mock Implementation** [cite: 30] instead of real devnet execution.

* **Why:** This focuses on **architecture and flow**, which is the core of the problem. [cite_start]By mocking the DEX SDKs (as shown in the `Mock Implementation Guide` [cite: 90]), I could:
    * Reliably simulate price differences between DEXs to test the routing logic.
    * [cite_start]Simulate network delays and execution times [cite: 31] without being dependent on a live devnet's unreliability.
    * Build a robust system that is fully testable without needing a Solana wallet or devnet funds.

### 3. Extending to Other Order Types

The current `Market Order` engine is the base. [cite_start]Here is how it could be extended[cite: 11]:

* **Limit Order:** We would add a `targetPrice` to the order. The **Worker** would, instead of executing immediately, place the order in a "waiting" state. A separate process would monitor the (mocked) price feed. When the `currentPrice >= targetPrice`, it would then push the order into the *existing* `orderQueue` to be processed just like a Market Order.
* **Sniper Order:** This is a more advanced Limit Order. We would add a `targetTokenLaunch` field. The **Worker** would subscribe to a (mocked) "new pool" or "migration" event. The moment that event fires, it would *immediately* push the order into the `orderQueue` for execution, aiming to be the first in line.

---

## 📦 Setup and Running the Project

### Prerequisites

* [Node.js](https://nodejs.org/en/) (v18+)
* [Docker](https://www.docker.com/products/docker-desktop/) (to run Redis and Postgres)

### 1. Clone the Repository

```bash
git clone [https://github.com/utkarsh205-ui/order-execution-engine.git](https://github.com/utkarsh205-ui/order-execution-engine.git)
cd order-execution-engine
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Databases (Redis & Postgres)

You must have Docker running. These commands will start the required database containers in the background.

```bash
# Start the Redis queue database
docker run -d --name order-queue-redis -p 6379:6379 redis

# Start the PostgreSQL history database
# (Note: This uses a custom volume and port 5433 to avoid conflicts)
docker run -d \
  --name order-history-db \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -v pg-data-final:/var/lib/postgresql \
  -p 5433:5432 \
  postgres
```
*(This app connects to Postgres on port **5433** as configured in `src/db.ts`)*.

### 4. Run the Server

```bash
npm run dev
```
The server will start on `http://localhost:3000`. You will see logs confirming the database tables are ready.

---

## ⚡ How to Use (API Test)

[cite_start]You will need a tool like **Postman** to test this[cite: 86].

### Step 1: Submit an Order (`POST`)

* **Method:** `POST`
* [cite_start]**URL:** `http://localhost:3000/api/orders/execute` [cite: 6]
* **Body** (raw, JSON):
    ```json
    {
      "tokenIn": "SOL",
      "tokenOut": "USDC",
      "amountIn": 10
    }
    ```
* [cite_start]**Response:** You will get back your unique `orderId`[cite: 8].
    ```json
    {
      "orderId": "a1b2c3d4-..."
    }
    ```
* **Copy this `orderId`!**

### Step 2: Connect to WebSocket (`GET`)

* In Postman, create a new **WebSocket** request.
* **URL:** `ws://localhost:3000/api/orders/execute`
* **Params** (Query Params):
    * **Key:** `orderId`
    * **Value:** (Paste the `orderId` you just copied)
* Click **Connect**.

[cite_start]You will immediately see the full, real-time stream of status updates [cite: 69] [cite_start]for your order as it's processed by the queue (e.g., `pending` -> `routing` -> `building` -> `submitted` -> `confirmed`) [cite: 16-20].

---

## ✅ Running the Tests

[cite_start]This project includes a test suite with **11 passing unit tests** to meet the deliverable requirement[cite: 86].

The tests cover:
* **MockDEXRouter:** 3 tests ensuring the mock router logic for quotes and swaps is sound.
* **ConnectionManager:** 8 tests covering the complete WebSocket connection lifecycle (add, remove, get, send, and handling closed/non-existent connections).

### How to Run Tests

From the project root, run:

```bash
npm run test
```

### Test Output

```
PASS  src/mockDexRouter.test.ts
PASS  src/connectionManager.test.ts

Test Suites: 2 passed, 2 total
Tests:       11 passed, 11 total
Snapshots:   0 total
Time:        ...s
Ran all test suites.
```
