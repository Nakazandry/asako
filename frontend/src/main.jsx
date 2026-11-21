import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { PreferencesProvider } from './context/PreferencesContext.jsx';
import { NotificationsProvider } from './context/NotificationsContext.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PreferencesProvider>
        <AuthProvider>
          <NotificationsProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3200,
                style: {
                  border: '1px solid #dce9df',
                  borderRadius: '14px',
                  background: '#ffffff',
                  color: '#17362b',
                  boxShadow: '0 12px 30px rgba(28, 62, 41, 0.12)',
                },
                success: { iconTheme: { primary: '#147a54', secondary: '#ffffff' } },
              }}
            />
          </NotificationsProvider>
        </AuthProvider>
      </PreferencesProvider>
    </BrowserRouter>
  </React.StrictMode>
);
