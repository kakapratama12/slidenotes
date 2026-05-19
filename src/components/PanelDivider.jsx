import { useRef, useState } from 'react';

export default function PanelDivider({ onDragStart, onDrag, onDragEnd }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sessionRef = useRef(null);

  const handlePointerDown = (event) => {
    event.preventDefault();
    setIsDragging(true);

    onDragStart(event.clientX);

    sessionRef.current = {
      startX: event.clientX,
    };

    const handlePointerMove = (moveEvent) => {
      if (!sessionRef.current) {
        return;
      }

      onDrag(moveEvent.clientX - sessionRef.current.startX);
    };

    const handlePointerUp = () => {
      sessionRef.current = null;
      setIsDragging(false);
      onDragEnd();
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
  };

  const isActive = isHovered || isDragging;

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize notes panel"
      className={`relative w-1 shrink-0 cursor-col-resize select-none ${
        isActive ? 'bg-blue-400' : 'bg-slate-200 hover:bg-slate-300'
      }`}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
  );
}
