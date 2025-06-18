import React from "react";

const DartboardHighlight = ({ currentDouble, flashColor }) => {
  const dartboardOrder = [
    6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 20, 1, 18, 4, 13,
  ];

  const segments = [];
  const cx = 50;
  const cy = 50;
  const rInner = 40;
  const rOuter = 50;
  const angleStep = (2 * Math.PI) / 20;

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

    const isCurrent = dartboardOrder[i] === currentDouble;

    segments.push(
      <path
        key={i}
        d={pathData}
        fill={isCurrent ? "red" : "#ccc"}
        stroke="white"
        strokeWidth="0.5"
      />
    );
  }

  return (
    <svg width="60" height="60" viewBox="0 0 100 100">
      <g transform="rotate(-9, 50, 50)">{segments}</g>
      <circle cx="50" cy="50" r="38" fill={flashColor || "white"} />
      <text
        x="50"
        y="60"
        textAnchor="middle"
        fontWeight="bold"
        fontSize="30"
        fill="#333"
        fontFamily="Arial"
      >
        D{currentDouble}
      </text>
    </svg>
  );
};

export default DartboardHighlight;
