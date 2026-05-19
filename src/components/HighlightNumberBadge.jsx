import { darkenHighlightColor } from '../constants/highlightColors.js';

export default function HighlightNumberBadge({ number, x, y, color }) {
  const label = String(number);
  const badgeWidth = 10 + label.length * 7;
  const badgeHeight = 18;

  return (
    <g>
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
        y={y + badgeHeight / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff"
        fontSize={11}
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
        stroke="none"
      >
        {label}
      </text>
    </g>
  );
}
