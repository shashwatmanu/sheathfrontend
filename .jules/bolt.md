# Bolt's Journal

## 2024-05-22 - Authentication State Synchronization
**Learning:** The application uses both `localStorage` (client-side) and cookies (server-side compatible) for authentication. `app/page.js` relies on `localStorage` causing a client-side redirect, while `middleware.js` relies on cookies. Synchronization between them is critical for consistent behavior.
**Action:** When modifying authentication logic, ensure changes respect both storage mechanisms or gracefully handle desynchronization (e.g., cookie missing but localStorage present).
