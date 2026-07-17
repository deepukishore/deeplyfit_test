import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Bot,
  BookOpenText,
  ChartNoAxesCombined,
  Download as DownloadIcon,
  House,
  Info,
  LogOut,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/fitness';
import BrandLogo from './BrandLogo';
import '../styles/bottomNav.css';

const PRIMARY_NAV_ITEMS = [
  { path: '/home', icon: House, label: 'Home' },
  { path: '/diary', icon: BookOpenText, label: 'Diary' },
  { path: '/community', icon: UsersRound, label: 'Community' },
  { path: '/ai', icon: Bot, label: 'AI Coach', featured: true },
  { path: '/progress', icon: ChartNoAxesCombined, label: 'Progress' },
  { path: '/profile', icon: UserRound, label: 'Profile' },
];

const UTILITY_NAV_ITEMS = [
  { path: '/download', icon: DownloadIcon, label: 'Download' },
  { path: '/about', icon: Info, label: 'About' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const initials = getInitials(user?.name, user?.email);

  const handleLogout = () => {
    logout();
    toast.success('Logged out. See you soon!');
    navigate('/login');
  };

  const renderNavItem = (item) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    return (
      <button
        key={item.path}
        className={`nav-item ${isActive ? 'active' : ''} ${item.featured ? 'nav-item-featured' : ''}`}
        onClick={() => navigate(item.path)}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        title={item.label}
        type="button"
      >
        <span className="nav-icon">
          <span className="nav-icon-bg" />
          <Icon size={20} strokeWidth={isActive ? 2.4 : 1.9} />
        </span>
        <span className="nav-label">{item.label}</span>
      </button>
    );
  };

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <button className="nav-brand" type="button" onClick={() => navigate('/home')} title="Deeply Fit home">
        <span className="nav-brand-mark"><BrandLogo alt="" /></span>
        <span className="nav-brand-copy">
          <strong>Deeply Fit</strong>
          <small>Fitness workspace</small>
        </span>
      </button>

      <div className="nav-primary">
        {PRIMARY_NAV_ITEMS.map(renderNavItem)}
      </div>

      <div className="nav-sidebar-footer">
        <div className="nav-utility">
          {UTILITY_NAV_ITEMS.map(renderNavItem)}
        </div>
        <div className="nav-account">
          <div className="nav-account-avatar" aria-hidden="true">{initials}</div>
          <div className="nav-account-copy">
            <strong>{user?.name || 'Athlete'}</strong>
            <span title={user?.email}>{user?.email || 'Signed in'}</span>
          </div>
        </div>
        <button className="nav-logout" type="button" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
