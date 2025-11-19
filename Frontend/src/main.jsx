import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { App } from './App'
import './index.css' 
import { GoogleOAuthProvider } from '@react-oauth/google';


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <GoogleOAuthProvider clientId="905396434192-03aqn8vkab2knh33brep80bfvmh3ojik.apps.googleusercontent.com">
           <App />  
        </GoogleOAuthProvider>;
       
      </AuthProvider>
    </Router>
  </React.StrictMode>
);

