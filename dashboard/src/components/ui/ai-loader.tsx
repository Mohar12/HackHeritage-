import * as React from "react";

export interface LoaderProps {
  size?: number;
  colorTheme?: 'overview' | 'honest' | 'attack' | 'scalable' | 'large_scale' | 'audit' | string;
  visible?: boolean;
  onExited?: () => void;
}

export const Component: React.FC<LoaderProps> = ({
  size = 180,
  colorTheme = 'overview',
  visible = true,
  onExited,
}) => {
  const [shouldRender, setShouldRender] = React.useState(visible);
  const [phase, setPhase] = React.useState(visible ? 'entering' : 'idle');

  React.useEffect(() => {
    let enterTimer: any;
    let exitTimer: any;

    if (visible) {
      setShouldRender(true);
      setPhase('entering');
      enterTimer = setTimeout(() => {
        setPhase('active');
      }, 150);
    } else if (shouldRender) {
      setPhase('exiting');
      exitTimer = setTimeout(() => {
        setShouldRender(false);
        setPhase('idle');
        if (onExited) onExited();
      }, 160);
    }

    return () => {
      if (enterTimer) clearTimeout(enterTimer);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [visible, shouldRender, onExited]);

  if (!shouldRender) return null;

  return (
    <aside
      role="status"
      aria-label="Quantum Navigation State Loading"
      className={`hqds-loader-smoky-overlay hqds-loader-phase-${phase}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.35) 0%, rgba(6, 9, 18, 0.48) 100%)',
        boxShadow: 'inset 0 0 120px rgba(0, 0, 0, 0.35)',
        pointerEvents: phase === 'exiting' ? 'none' : 'all',
      }}
    >
      <div
        className={`hqds-blob-wrap hqds-blob-phase-${phase}`}
        style={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className={`hqds-kinetic-blob hqds-kinetic-blob-${colorTheme}`}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        <div
          className={`hqds-blob-core-glow hqds-blob-core-glow-${colorTheme}`}
          style={{
            position: 'absolute',
            width: size * 0.45,
            height: size * 0.45,
            borderRadius: '50%',
            filter: 'blur(16px)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </aside>
  );
};

export const AiLoader = Component;
export default Component;
