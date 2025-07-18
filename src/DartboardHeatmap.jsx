import React, { useState } from "react";

const DartboardHeatmap = ({ stats = [], mode = "D" }) => {
  const cx = 150;
  const cy = 150;
  const rBull = 5;
  const rOuterBull = 12;
  const rTrebleInner = 60;
  const rTrebleOuter = 65;
  const rDoubleInner = 100;
  const rDoubleOuter = 105;
  const rSegmentInner = rOuterBull;
  const rSegmentOuter = rDoubleOuter;
  const segmentCount = 20;
  const angleStep = (2 * Math.PI) / segmentCount;

  const dartboardOrder = [
    6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 20, 1, 18, 4, 13,
  ];

  const [tooltip, setTooltip] = useState(null);

  const getSegmentColor = (attempts) => {
    if (attempts === 0) return "#ccc";
    const ratio = Math.min(attempts / 30, 1); // 30+ attempts = red
    const r = Math.round(255 * ratio);
    const g = Math.round(255 * (1 - ratio));
    return `rgb(${r},${g},0)`;
  };

  const showTooltip = (e, text) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
      text,
    });
  };

  const hideTooltip = () => setTooltip(null);

  const formatTooltipText = (number, attempts) => {
    let label;
    if (number === 50) {
      label = "Bull";
    } else if (number === 25) {
      label = "25";
    } else {
      label = `${mode}${number}`;
    }
    return `(${label}) ${attempts} attempt${attempts !== 1 ? "s" : ""}`;
  };

  const renderSegments = () => {
    return dartboardOrder.map((number, i) => {
      const startAngle = i * angleStep;
      const endAngle = (i + 1) * angleStep;
      const attempts = stats.find((s) => s.double === number)?.attempts || 0;
      const fillColor = getSegmentColor(attempts);

      const x1 = cx + rSegmentOuter * Math.cos(startAngle);
      const y1 = cy + rSegmentOuter * Math.sin(startAngle);
      const x2 = cx + rSegmentInner * Math.cos(startAngle);
      const y2 = cy + rSegmentInner * Math.sin(startAngle);
      const x3 = cx + rSegmentInner * Math.cos(endAngle);
      const y3 = cy + rSegmentInner * Math.sin(endAngle);
      const x4 = cx + rSegmentOuter * Math.cos(endAngle);
      const y4 = cy + rSegmentOuter * Math.sin(endAngle);

      const pathData = `
        M ${x1} ${y1}
        L ${x2} ${y2}
        A ${rSegmentInner} ${rSegmentInner} 0 0 1 ${x3} ${y3}
        L ${x4} ${y4}
        A ${rSegmentOuter} ${rSegmentOuter} 0 0 0 ${x1} ${y1}
        Z
      `;

      const tooltipText = formatTooltipText(number, attempts);

      return (
        <path
          key={i}
          d={pathData}
          fill={fillColor}
          stroke="#888"
          strokeWidth="0.5"
          onMouseEnter={(e) => showTooltip(e, tooltipText)}
          onMouseLeave={hideTooltip}
          onClick={(e) => showTooltip(e, tooltipText)}
        />
      );
    });
  };

  const renderSegmentLines = () => {
    return dartboardOrder.map((_, i) => {
      const angle = i * angleStep;
      const x = cx + rSegmentOuter * Math.cos(angle);
      const y = cy + rSegmentOuter * Math.sin(angle);
      return (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke="#666"
          strokeWidth="0.5"
        />
      );
    });
  };

  const renderTrebleRing = () => {
    const ring = [];
    for (let i = 0; i < segmentCount; i++) {
      const startAngle = i * angleStep;
      const endAngle = (i + 1) * angleStep;

      const x1 = cx + rTrebleOuter * Math.cos(startAngle);
      const y1 = cy + rTrebleOuter * Math.sin(startAngle);
      const x2 = cx + rTrebleInner * Math.cos(startAngle);
      const y2 = cy + rTrebleInner * Math.sin(startAngle);
      const x3 = cx + rTrebleInner * Math.cos(endAngle);
      const y3 = cy + rTrebleInner * Math.sin(endAngle);
      const x4 = cx + rTrebleOuter * Math.cos(endAngle);
      const y4 = cy + rTrebleOuter * Math.sin(endAngle);

      const pathData = `
        M ${x1} ${y1}
        L ${x2} ${y2}
        A ${rTrebleInner} ${rTrebleInner} 0 0 1 ${x3} ${y3}
        L ${x4} ${y4}
        A ${rTrebleOuter} ${rTrebleOuter} 0 0 0 ${x1} ${y1}
        Z
      `;

      ring.push(
        <path
          key={`treble-${i}`}
          d={pathData}
          fill="none"
          stroke="#444"
          strokeWidth="0.5"
        />
      );
    }
    return ring;
  };

  const renderBulls = () => {
    const outerBullAttempts = stats.find((s) => s.double === 25)?.attempts || 0;
    const innerBullAttempts = stats.find((s) => s.double === 50)?.attempts || 0;

    const outerBullColor = getSegmentColor(outerBullAttempts);
    const innerBullColor = getSegmentColor(innerBullAttempts);

    return (
      <>
        <circle
          cx={cx}
          cy={cy}
          r={rOuterBull}
          fill={outerBullColor}
          stroke="black"
          strokeWidth="0.5"
          onMouseEnter={(e) =>
            showTooltip(e, formatTooltipText(25, outerBullAttempts))
          }
          onMouseLeave={hideTooltip}
          onClick={(e) =>
            showTooltip(e, formatTooltipText(25, outerBullAttempts))
          }
        />
        <circle
          cx={cx}
          cy={cy}
          r={rBull}
          fill={innerBullColor}
          stroke="black"
          strokeWidth="0.5"
          onMouseEnter={(e) =>
            showTooltip(e, formatTooltipText(50, innerBullAttempts))
          }
          onMouseLeave={hideTooltip}
          onClick={(e) =>
            showTooltip(e, formatTooltipText(50, innerBullAttempts))
          }
        />
      </>
    );
  };

  const renderNumbers = () => {
    const boardRotation = -9;
    return dartboardOrder.map((number, i) => {
      const angle = i * angleStep + angleStep / 2;
      const rText = (rTrebleInner + rDoubleInner) / 2;
      const x = cx + rText * Math.cos(angle);
      const y = cy + rText * Math.sin(angle);

      return (
        <text
          key={`number-${i}`}
          x={x}
          y={y + 4}
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="black"
          transform={`rotate(${-boardRotation}, ${x}, ${y})`}
          pointerEvents="none"
        >
          {number}
        </text>
      );
    });
  };

  return (
    <div style={{ position: "relative", width: 300, height: 215 }}>
      <svg width="300" height="215" viewBox="45 42 215 215">
        <g transform="rotate(-9, 150, 150)">
          {renderSegments()}
          {renderSegmentLines()}
          {renderTrebleRing()}
          {renderBulls()}
          {renderNumbers()}
          <circle
            cx={cx}
            cy={cy}
            r={rDoubleInner}
            stroke="black"
            strokeWidth="0.5"
            fill="none"
          />
          <circle
            cx={cx}
            cy={cy}
            r={rDoubleOuter}
            stroke="black"
            strokeWidth="0.5"
            fill="none"
          />
        </g>
      </svg>
      {tooltip && (
        <div
          style={{
            position: "absolute",
            top: tooltip.y,
            left: tooltip.x,
            background: "white",
            padding: "4px 8px",
            border: "1px solid black",
            borderRadius: "4px",
            fontSize: "12px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default DartboardHeatmap;
