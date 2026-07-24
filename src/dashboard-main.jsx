import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import Dashboard from "./components/dashboard/Dashboard.jsx";
import "./components/dashboard/dashboard.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Dashboard root element is missing.");
}

createRoot(rootElement).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>,
);
