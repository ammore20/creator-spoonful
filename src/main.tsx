import { createRoot } from "react-dom/client";
import { HelmetProvider } from 'react-helmet-async';
import App from "./App.tsx";
import "./index.css";
import { initMonitoring } from "./lib/monitoring";
import { track } from "./lib/analytics";

initMonitoring();
if (window.location.pathname === "/") track("landing_view");

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
