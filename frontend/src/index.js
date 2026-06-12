import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const initializeTheme = () => {
  try {
    const storedTheme = window.localStorage.getItem('deeply_fit_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useLightTheme = storedTheme ? storedTheme === 'light' : !prefersDark;

    document.documentElement.classList.toggle('light', useLightTheme);
    document.documentElement.style.colorScheme = useLightTheme ? 'light' : 'dark';
  } catch (err) {
    // Ignore storage or media query errors and fall back to the CSS default.
  }
};

initializeTheme();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
