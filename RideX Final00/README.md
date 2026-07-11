# RideX Final00 — Application Source

This folder contains the RideX application code (frontend + Express server).

For the full project overview, architecture, environment variables, and setup instructions, see the [root README](../README.md).

## Quick reference

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run preview
npm run lint      # tsc --noEmit
```

See [`server.ts`](./server.ts) for the three backend endpoints (`/api/chat`, `/api/calculate-price`, `/api/send-sos`) and [`firestore.rules`](./firestore.rules) for the Firestore security model.
