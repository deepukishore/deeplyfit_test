import { useEffect } from 'react';

const SURFACE_SELECTOR = [
  '.card',
  '.calorie-command-card',
  '.streak-command-card',
  '.macro-bars-card',
  '.water-command-card',
  '.meal-suggestions-card',
  '.workout-card',
  '.quick-action-btn',
  '.feed-post',
  '.meal-section',
  '.stat-card',
  '.achievement-card',
  '.comparison-card',
  '.planner-exercise-card',
  '.planner-calorie-preview',
  '.auth-card',
  '.about-capability',
  '.about-person',
].join(',');

const resetSurface = (surface) => {
  if (!surface) return;
  surface.classList.remove('is-surface-tilting');
  surface.style.removeProperty('--surface-rotate-x');
  surface.style.removeProperty('--surface-rotate-y');
  surface.style.removeProperty('--surface-origin-x');
  surface.style.removeProperty('--surface-origin-y');
};

const SurfaceMotion = () => {
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (motionQuery.matches || !pointerQuery.matches) return undefined;

    let activeSurface = null;
    let frame = null;
    let pointerEvent = null;

    const renderTilt = () => {
      frame = null;
      const event = pointerEvent;
      if (!event || !(event.target instanceof Element)) return;

      const surface = event.target.closest(SURFACE_SELECTOR);
      if (!surface) {
        resetSurface(activeSurface);
        activeSurface = null;
        return;
      }

      if (activeSurface !== surface) {
        resetSurface(activeSurface);
        activeSurface = surface;
      }

      const bounds = surface.getBoundingClientRect();
      const normalizedX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) - 0.5;
      const normalizedY = ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) - 0.5;
      const rotateX = Math.max(-5, Math.min(5, normalizedY * -8));
      const rotateY = Math.max(-5, Math.min(5, normalizedX * 8));

      surface.style.setProperty('--surface-rotate-x', `${rotateX.toFixed(2)}deg`);
      surface.style.setProperty('--surface-rotate-y', `${rotateY.toFixed(2)}deg`);
      surface.style.setProperty('--surface-origin-x', `${((normalizedX + 0.5) * 100).toFixed(1)}%`);
      surface.style.setProperty('--surface-origin-y', `${((normalizedY + 0.5) * 100).toFixed(1)}%`);
      surface.classList.add('is-surface-tilting');
    };

    const handlePointerMove = (event) => {
      pointerEvent = event;
      if (!frame) frame = window.requestAnimationFrame(renderTilt);
    };

    const handlePointerOut = (event) => {
      const nextTarget = event.relatedTarget;
      if (!activeSurface || (nextTarget instanceof Node && activeSurface.contains(nextTarget))) return;
      resetSurface(activeSurface);
      activeSurface = null;
    };

    const handleWindowBlur = () => {
      resetSurface(activeSurface);
      activeSurface = null;
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerout', handlePointerOut, { passive: true });
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resetSurface(activeSurface);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerout', handlePointerOut);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  return null;
};

export default SurfaceMotion;
