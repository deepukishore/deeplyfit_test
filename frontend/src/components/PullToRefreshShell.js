import React, { useRef, useState } from 'react';
import { useRefreshController } from '../context/RefreshContext';

const PULL_THRESHOLD = 74;
const MAX_PULL = 110;

const PullToRefreshShell = ({ children }) => {
  const { refresh } = useRefreshController();
  const startRef = useRef(null);
  const modeRef = useRef('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const reset = () => {
    startRef.current = null;
    modeRef.current = 'idle';
    setPullDistance(0);
  };

  const isBlockedTarget = (target) => (
    target.closest('.modal-overlay') ||
    target.closest('[data-swipe-lock="true"]') ||
    target.closest('input, textarea, select, button')
  );

  const handleTouchStart = (event) => {
    if (refreshing || window.scrollY > 4 || isBlockedTarget(event.target)) {
      modeRef.current = 'blocked';
      return;
    }

    const touch = event.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
    modeRef.current = 'pending';
  };

  const handleTouchMove = (event) => {
    if (!startRef.current || refreshing) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - startRef.current.x;
    const deltaY = touch.clientY - startRef.current.y;

    if (modeRef.current === 'pending') {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        modeRef.current = 'horizontal';
        return;
      }

      if (deltaY <= 0 || window.scrollY > 4) {
        modeRef.current = 'blocked';
        return;
      }

      modeRef.current = 'vertical';
    }

    if (modeRef.current !== 'vertical') return;

    event.preventDefault();
    const nextDistance = Math.min(MAX_PULL, deltaY * 0.45);
    setPullDistance(nextDistance);
  };

  const handleTouchEnd = async () => {
    if (modeRef.current !== 'vertical') {
      reset();
      return;
    }

    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        await refresh();
      } finally {
        setRefreshing(false);
        reset();
      }
      return;
    }

    reset();
  };

  return (
    <div
      className="pull-refresh-shell"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className={`pull-refresh-indicator ${pullDistance > 0 || refreshing ? 'visible' : ''}`}
        style={{ height: Math.max(pullDistance, refreshing ? PULL_THRESHOLD : 0) }}
      >
        <div className={`pull-refresh-spinner ${refreshing ? 'spinning' : ''}`} />
        <span>{refreshing ? 'Refreshing...' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}</span>
      </div>
      <div
        className="pull-refresh-content"
        style={{ transform: `translateY(${refreshing ? 18 : Math.min(pullDistance * 0.35, 18)}px)` }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefreshShell;
