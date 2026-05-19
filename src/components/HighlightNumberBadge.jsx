const BADGE_PADDING = 2;
const BADGE_FONT_SIZE = 12;
const BADGE_CHAR_WIDTH = 7;

export default function HighlightNumberBadge({ number, x, y }) {
  const label = String(number);
  const textWidth = label.length * BADGE_CHAR_WIDTH;
  const badgeWidth = textWidth + BADGE_PADDING * 2;
  const badgeHeight = BADGE_FONT_SIZE + BADGE_PADDING * 2;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={badgeWidth}
        height={badgeHeight}
        rx={3}
        fill="rgba(0, 0, 0, 0.75)"
      />
      <text
        x={x + badgeWidth / 2}
        y={y + badgeHeight / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff"
        fontSize={BADGE_FONT_SIZE}
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
        stroke="none"
      >
        {label}
      </text>
    </g>
  );
}
