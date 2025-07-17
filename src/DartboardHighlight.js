import React from "react";

const DartboardHighlight = ({
  currentDouble,
  flashColor,
  mode = "doubles",
}) => {
  const dartboardOrder = [
    6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 20, 1, 18, 4, 13,
  ];

  const cx = 50;
  const cy = 50;
  const rInner = 40;
  const rOuter = 50;
  const angleStep = (2 * Math.PI) / 20;

  // Helper to display appropriate label
  const getDisplayText = (value) => {
    if (value === undefined || value === null) return "";
    if (value === 50) return "Bull";
    if (value === 25) return "25";
    if (mode === "singles") return `${value}`;
    if (mode === "trebles") return `T${value}`;
    return `D${value}`;
  };

  const isOuterBull = currentDouble === 25;
  const isInnerBull = currentDouble === 50;
  const highlightAll = isOuterBull || isInnerBull;
  const highlightColor = isOuterBull
    ? "green"
    : isInnerBull
    ? "red"
    : flashColor || "red";

  // Create 20 segments
  const segments = [];
  for (let i = 0; i < 20; i++) {
    const startAngle = i * angleStep;
    const endAngle = (i + 1) * angleStep;

    const x1 = cx + rOuter * Math.cos(startAngle);
    const y1 = cy + rOuter * Math.sin(startAngle);
    const x2 = cx + rInner * Math.cos(startAngle);
    const y2 = cy + rInner * Math.sin(startAngle);
    const x3 = cx + rInner * Math.cos(endAngle);
    const y3 = cy + rInner * Math.sin(endAngle);
    const x4 = cx + rOuter * Math.cos(endAngle);
    const y4 = cy + rOuter * Math.sin(endAngle);

    const pathData = `
      M ${x1} ${y1}
      L ${x2} ${y2}
      A ${rInner} ${rInner} 0 0 1 ${x3} ${y3}
      L ${x4} ${y4}
      A ${rOuter} ${rOuter} 0 0 0 ${x1} ${y1}
      Z
    `;

    const segmentNumber = dartboardOrder[i];
    const isCurrent = segmentNumber === currentDouble;

    const fillColor = highlightAll
      ? highlightColor
      : isCurrent
      ? highlightColor
      : "#ccc";

    segments.push(
      <path
        key={i}
        d={pathData}
        fill={fillColor}
        stroke="white"
        strokeWidth="0.5"
      />
    );
  }

  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 100 100"
      aria-label={`Current target: ${currentDouble}`}
    >
      <g transform="rotate(-9, 50, 50)">{segments}</g>

      {/* No bulls-eye highlight circles */}

      {/* Optional subtle center highlight for non-bull */}
      {!highlightAll && flashColor && (
        <circle cx={cx} cy={cy} r={38} fill={flashColor} opacity={1} />
      )}

      {/* Text label below the board */}
      <text
        x="50"
        y="60"
        textAnchor="middle"
        fontWeight="bold"
        fontSize="28"
        fill="#333"
        fontFamily="Arial"
      >
        {getDisplayText(currentDouble)}
      </text>
    </svg>
  );
};

export default DartboardHighlight;
