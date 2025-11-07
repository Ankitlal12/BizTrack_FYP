import React from "react";
import ReactDom from 'react-router-dom'
import { BrowserRouter } from "react-router-dom";
import {App} from './App'
import '.index.css'

ReactDom.createRoot(document.getElementById('root')).render(
 
   <React.StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>
)