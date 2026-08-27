import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-reload on new Vite deployment when stale chunks return 404
window.addEventListener("vite:preloadError", (event) => {
  console.warn("New version detected, reloading to fetch latest bundle...", event);
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
