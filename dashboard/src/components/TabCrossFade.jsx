import React, { useState, useEffect, useRef } from 'react';

/**
 * TabCrossFade
 * ============
 * Shared smooth cross-fade transition container for tab contents (Stage 6).
 * Renders outgoing content fading out while incoming content fades and slides in,
 * eliminating abrupt snapping when switching between tabs.
 */
export default function TabCrossFade({ activeKey, children, duration = 320, className = '' }) {
  const [items, setItems] = useState([
    { key: activeKey, content: children, status: 'active' }
  ]);
  const prevKeyRef = useRef(activeKey);
  const prevContentRef = useRef(children);

  useEffect(() => {
    if (activeKey !== prevKeyRef.current) {
      const outgoingKey = prevKeyRef.current;
      const outgoingContent = prevContentRef.current;

      prevKeyRef.current = activeKey;
      prevContentRef.current = children;

      // Render both outgoing and incoming panes concurrently in shared grid cell
      setItems([
        { key: outgoingKey, content: outgoingContent, status: 'exiting' },
        { key: activeKey, content: children, status: 'entering' },
      ]);

      const timer = setTimeout(() => {
        setItems([
          { key: activeKey, content: children, status: 'active' }
        ]);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      prevContentRef.current = children;
    }
  }, [activeKey, children, duration]);

  return (
    <div className={`hqds-tab-crossfade-stage ${className}`}>
      {items.map((item) => (
        <div
          key={item.key}
          className={`hqds-tab-crossfade-pane is-${item.status}`}
          style={{
            animationDuration: `${duration}ms`,
            transitionDuration: `${duration}ms`,
          }}
          aria-hidden={item.status === 'exiting'}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
