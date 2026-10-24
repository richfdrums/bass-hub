// Desktop entry point (index.html -> renderer.jsx). All UI lives in App.jsx,
// which the iPad build renders too.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
