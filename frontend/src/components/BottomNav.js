import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/bottomNav.css';

const NAV_ITEMS = [
  { path: '/home', icon: 'Home', label: 'Home' },
  { path: '/diary', icon: 'Diary', label: 'Diary' },
  { path: '/community', icon: 'Feed', label: 'Community' },
  { path: '/ai', icon: 'AI', label: 'Coach' },
  { path: '/progress', icon: 'Stats', label: 'Progress' },
  { path: '/profile', icon: 'Me', label: 'Profile' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
          >
            <span className="nav-icon" style={{ position: 'relative' }}>
              <span className="nav-icon-bg" />
              {item.icon}
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
