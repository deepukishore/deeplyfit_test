import React, { useEffect, useRef } from 'react';

const AmbientScene = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return undefined;

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const lowPowerDevice = window.innerWidth < 900 || connection?.saveData || (navigator.hardwareConcurrency || 8) <= 4;
    if (lowPowerDevice) {
      canvas.hidden = true;
      return undefined;
    }

    let disposed = false;
    let cleanupRenderer = null;
    let idleId = null;
    let fallbackTimer = null;

    const initialize = async () => {
      try {
        const { startAmbientScene } = await import('./AmbientSceneRenderer');
        if (!disposed) cleanupRenderer = startAmbientScene(canvas);
      } catch (error) {
        canvas.hidden = true;
      }
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(initialize, { timeout: 1400 });
    } else {
      fallbackTimer = window.setTimeout(initialize, 700);
    }

    return () => {
      disposed = true;
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      if (cleanupRenderer) cleanupRenderer();
    };
  }, []);

  return (
    <div className="ambient-scene" aria-hidden="true">
      <canvas ref={canvasRef} className="ambient-scene-canvas" />
    </div>
  );
};

export default AmbientScene;
