import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "./contexts/AppContext.jsx";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
);