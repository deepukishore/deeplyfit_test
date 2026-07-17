import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  BookOpenText,
  ChartNoAxesCombined,
  Download as DownloadIcon,
  House,
  Info,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react';
import '../styles/bottomNav.css';

const NAV_ITEMS = [
  { path: '/home', icon: House, label: 'Home' },
  { path: '/diary', icon: BookOpenText, label: 'Diary' },
  { path: '/community', icon: UsersRound, label: 'Community' },
  { path: '/ai', icon: Bot, label: 'Coach' },
  { path: '/progress', icon: ChartNoAxesCombined, label: 'Progress' },
  { path: '/profile', icon: UserRound, label: 'Profile' },
  { path: '/download', icon: DownloadIcon, label: 'Download', desktopOnly: true, bottomStart: true },
  { path: '/about', icon: Info, label: 'About', desktopOnly: true },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <button className="nav-brand" type="button" onClick={() => navigate('/home')} title="Deeply Fit home">
        <span className="nav-brand-mark"><Zap size={19} fill="currentColor" /></span>
        <span>Deeply Fit</span>
      </button>
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            className={`nav-item ${isActive ? 'active' : ''} ${item.desktopOnly ? 'nav-item-desktop-only' : ''} ${item.bottomStart ? 'nav-item-bottom-start' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            title={item.label}
          >
            <span className="nav-icon" style={{ position: 'relative' }}>
              <span className="nav-icon-bg" />
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.9} />
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
