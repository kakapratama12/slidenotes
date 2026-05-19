import { darkenHighlightColor } from '../constants/highlightColors.js';

export default function HighlightNumberBadge({ number, x, y, color }) {
  const label = String(number);
  const badgeWidth = 10 + label.length * 7;
  const badgeHeight = 18;

  return (
    <g pointerEvents="none">
      <rect
        x={x}
        y={y}
        width={badgeWidth}
        height={badgeHeight}
        rx={3}
        fill={darkenHighlightColor(color)}
      />
      <text
        x={x + badgeWidth / 2}
        y={y + 13}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={11}
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}
