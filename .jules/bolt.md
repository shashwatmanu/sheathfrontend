## 2024-05-15 - [Hyperspeed Component Isolation]
**Learning:** Using `document.getElementById` in React components for Three.js/WebGL injections violates component isolation principles and breaks when multiple instances are rendered or when Next.js navigates.
**Action:** Replace direct DOM queries with React refs (`useRef`) to properly reference the container element.
