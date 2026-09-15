import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast'; // Notifications ke liye[cite: 1]
import './index.css';
import App from './App.jsx';
import { UserProvider } from './context/UserContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider>
      <App />
      <Toaster position="top-right" />
    </UserProvider>
  </StrictMode>,
);