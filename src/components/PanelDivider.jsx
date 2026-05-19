import { useRef, useState } from 'react';

export default function PanelDivider({ onDrag, onDragEnd }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dividerRef = useRef(null);
  const rafRef = useRef(null);
  const pendingClientXRef = useRef(null);

  const handlePointerDown = (event) => {
    event.preventDefault();
    const divider = dividerRef.current;
    if (!divider) {
      return;
    }

    divider.setPointerCapture(event.pointerId);
    setIsDragging(true);
    pendingClientXRef.current = event.clientX;
    onDrag(event.clientX);

    const flushDrag = () => {
      rafRef.current = null;
      if (pendingClientXRef.current !== null) {
        onDrag(pendingClientXRef.current);
      }
    };

    const handlePointerMove = (moveEvent) => {
      pendingClientXRef.current = moveEvent.clientX;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flushDrag);
      }
    };

    const handlePointerUp = (upEvent) => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      pendingClientXRef.current = upEvent.clientX;
      onDrag(upEvent.clientX);
      onDragEnd();

      divider.releasePointerCapture(upEvent.pointerId);
      setIsDragging(false);
      divider.removeEventListener('pointermove', handlePointerMove);
      divider.removeEventListener('pointerup', handlePointerUp);
      divider.removeEventListener('pointercancel', handlePointerUp);
    };

    divider.addEventListener('pointermove', handlePointerMove);
    divider.addEventListener('pointerup', handlePointerUp);
    divider.addEventListener('pointercancel', handlePointerUp);
  };

  const isActive = isHovered || isDragging;

  return (
    <div
      ref={dividerRef}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize notes panel"
      className={`relative w-1 shrink-0 cursor-col-resize touch-none select-none ${
        isActive ? 'bg-blue-400' : 'bg-slate-200 hover:bg-slate-300'
      }`}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
  );
}
