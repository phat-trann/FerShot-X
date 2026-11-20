import {installIpcDiagnostics} from "./platform/diagnostics";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./ui.css";

installIpcDiagnostics();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
