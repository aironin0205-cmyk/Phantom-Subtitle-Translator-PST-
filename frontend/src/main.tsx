import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// This finds the 'root' div in our index.html and tells React to take control of it.
// React.StrictMode is a developer tool for highlighting potential problems in an application.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
