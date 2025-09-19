import React from "react";
import ReactDOM from "react-dom/client";
// Zustand does not require a store import at the root
import App from "./App";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>
);
