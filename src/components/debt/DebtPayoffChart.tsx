import { useState, type MouseEvent } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { formatCurrencyCompact } from '../../lib/format';

interface DebtPayoffChartProps {
  /** Year-indexed total-balance series (index 0 = today), both already padded to the same length
   *  by the caller so they share one x-axis - see DebtPage's use of padToLength. */
  minimumOnlyBalances: number[];
  withStrategyBalances: number[];
  /** Whether an extra budget is actually set - hides the second line/legend/marker when 0, same
   *  "only show a series if there's something to show" pattern as MortgageChart's hasExtraPayment. */
  hasExtraBudget: boolean;
  /** Year index (from today) each schedule's total balance reaches $0 - drives the vertical payoff
   *  markers. */
  minimumOnlyPayoffYear: number;
  withStrategyPayoffYear: number;
}

const DESKTOP_WIDTH = 720;
const DESKTOP_HEIGHT = 240;
const DESKTOP_PADDING = { top: 20, right: 20, bottom: 28, left: 58 };
const MOBILE_WIDTH = 360;
const MOBILE_HEIGHT = 260;
// Left is sized to formatCurrencyCompact's M-range output ("$2.94M") at the bumped mobile
// font-size - see CashflowChart's mobile padding for the same reasoning. No right-side axis here,
// so right stays unchanged.
const MOBILE_PADDING = { top: 18, right: 20, bottom: 24, left: 66 };
const DESKTOP_AXIS_TICK_COUNT = 4;
// Fewer y-axis values on mobile declutters the now-bigger-font labels - same reasoning as
// CashflowChart's mobile tick count.
const MOBILE_AXIS_TICK_COUNT = 3;
const DESKTOP_AXIS_LABEL_STACK_OFFSET = 7;
const MOBILE_AXIS_LABEL_STACK_OFFSET = 10;
const DESKTOP_TOOLTIP_WIDTH = 150;
const MOBILE_TOOLTIP_WIDTH = 174;
const DESKTOP_TOOLTIP_ROW_HEIGHT = 18;
const MOBILE_TOOLTIP_ROW_HEIGHT = 22;
const TOOLTIP_TOP_PADDING = 18;
const TOOLTIP_BOTTOM_PADDING = 10;

function buildPath(values: number[], scaleX: (index: number) => number, scaleY: (value: number) => number): string {
  return values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${scaleX(index)} ${scaleY(value)}`).join(' ');
}

function axisTicks(min: number, max: number, count: number): number[] {
  if (max === min) {
    return [min];
  }
  return Array.from({ length: count }, (_, i) => min + ((max - min) * i) / (count - 1));
}

/** Total-debt-balance chart comparing minimum-payments-only against the chosen payoff strategy -
 *  reuses `.cashflow-chart*` classes rather than new CSS (same reuse MortgageChart.tsx already
 *  established), and reuses the `primary`/`unallocated` color roles for the minimum-only-vs-
 *  with-strategy lines the same way MortgageChart reuses them for original-vs-with-extra-payments. */
export function DebtPayoffChart({
  minimumOnlyBalances,
  withStrategyBalances,
  hasExtraBudget,
  minimumOnlyPayoffYear,
  withStrategyPayoffYear,
}: Readonly<DebtPayoffChartProps>) {
  const isMobile = useIsMobile();
  const WIDTH = isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH;
  const HEIGHT = isMobile ? MOBILE_HEIGHT : DESKTOP_HEIGHT;
  const PADDING = isMobile ? MOBILE_PADDING : DESKTOP_PADDING;
  const AXIS_LABEL_STACK_OFFSET = isMobile ? MOBILE_AXIS_LABEL_STACK_OFFSET : DESKTOP_AXIS_LABEL_STACK_OFFSET;
  const AXIS_TICK_COUNT = isMobile ? MOBILE_AXIS_TICK_COUNT : DESKTOP_AXIS_TICK_COUNT;
  const TOOLTIP_WIDTH = isMobile ? MOBILE_TOOLTIP_WIDTH : DESKTOP_TOOLTIP_WIDTH;
  const TOOLTIP_ROW_HEIGHT = isMobile ? MOBILE_TOOLTIP_ROW_HEIGHT : DESKTOP_TOOLTIP_ROW_HEIGHT;

  const count = minimumOnlyBalances.length;
  const yearLabels = minimumOnlyBalances.map((_, index) => `Y${index}`);
  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const balanceMax = Math.max(...minimumOnlyBalances, ...withStrategyBalances, 0);
  const scaleX = (index: number) => PADDING.left + (count === 1 ? innerWidth / 2 : (index / (count - 1)) * innerWidth);
  const scaleBalanceY = (value: number) => PADDING.top + innerHeight - (balanceMax === 0 ? 0 : (value / balanceMax) * innerHeight);

  const minimumOnlyLine = buildPath(minimumOnlyBalances, scaleX, scaleBalanceY);
  const withStrategyLine = buildPath(withStrategyBalances, scaleX, scaleBalanceY);
  const balanceTicks = axisTicks(0, balanceMax, AXIS_TICK_COUNT);
  // 3 points (start/mid/end) rather than desktop's 4 on mobile - half as many x-axis labels to
  // cram into a narrower box. Deduplicated - a very short schedule (e.g. an already-tiny or
  // already-paid-off balance) can otherwise produce repeated indexes here, which would render
  // duplicate-keyed ticks.
  const xTickIndexesRaw = isMobile
    ? [0, Math.round((count - 1) / 2), count - 1]
    : [0, Math.round((count - 1) / 3), Math.round(((count - 1) * 2) / 3), count - 1];
  const xTickIndexes = [...new Set(xTickIndexesRaw)];

  const indexFromClientX = (svg: SVGSVGElement, clientX: number): number => {
    const rect = svg.getBoundingClientRect();
    const scaleFactor = rect.width === 0 ? 1 : WIDTH / rect.width;
    const xInViewBox = (clientX - rect.left) * scaleFactor;
    const clamped = Math.min(Math.max(xInViewBox, PADDING.left), WIDTH - PADDING.right);
    const ratio = innerWidth === 0 ? 0 : (clamped - PADDING.left) / innerWidth;
    return Math.min(Math.max(Math.round(ratio * (count - 1)), 0), count - 1);
  };

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    setHoverIndex(indexFromClientX(event.currentTarget, event.clientX));
  };

  const hoverX = hoverIndex === null ? null : scaleX(hoverIndex);
  let tooltipX = 0;
  if (hoverX !== null) {
    const tooltipFlipped = hoverX + 12 + TOOLTIP_WIDTH > WIDTH - PADDING.right;
    tooltipX = tooltipFlipped ? hoverX - 12 - TOOLTIP_WIDTH : hoverX + 12;
  }

  const tooltipRows =
    hoverIndex === null
      ? []
      : [
          { text: `Minimums only: ${formatCurrencyCompact(minimumOnlyBalances[hoverIndex])}`, className: 'primary' },
          ...(hasExtraBudget
            ? [{ text: `With strategy: ${formatCurrencyCompact(withStrategyBalances[hoverIndex])}`, className: 'unallocated' }]
            : []),
        ];
  const tooltipHeight = TOOLTIP_TOP_PADDING + tooltipRows.length * TOOLTIP_ROW_HEIGHT + TOOLTIP_BOTTOM_PADDING;

  return (
    <div className="cashflow-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        className={isMobile ? 'cashflow-chart__svg cashflow-chart__svg--mobile' : 'cashflow-chart__svg'}
        role="img"
        aria-label={`Total debt balance over ${count - 1} years, minimum payments only${hasExtraBudget ? ' vs. with your chosen payoff strategy' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {balanceTicks.map((tick) => (
          <line
            key={`grid-${tick}`}
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={scaleBalanceY(tick)}
            y2={scaleBalanceY(tick)}
            className="cashflow-chart__gridline"
          />
        ))}

        <path d={minimumOnlyLine} className="cashflow-chart__line cashflow-chart__line--primary" />
        {hasExtraBudget && <path d={withStrategyLine} className="cashflow-chart__line cashflow-chart__line--unallocated" />}

        {minimumOnlyPayoffYear > 0 && minimumOnlyPayoffYear < count - 1 && (
          <line
            x1={scaleX(minimumOnlyPayoffYear)}
            x2={scaleX(minimumOnlyPayoffYear)}
            y1={PADDING.top}
            y2={HEIGHT - PADDING.bottom}
            className="cashflow-chart__marker cashflow-chart__marker--primary"
          />
        )}
        {hasExtraBudget && withStrategyPayoffYear > 0 && withStrategyPayoffYear < count - 1 && (
          <line
            x1={scaleX(withStrategyPayoffYear)}
            x2={scaleX(withStrategyPayoffYear)}
            y1={PADDING.top}
            y2={HEIGHT - PADDING.bottom}
            className="cashflow-chart__marker cashflow-chart__marker--unallocated"
          />
        )}

        {xTickIndexes.map((index) => (
          <text key={index} x={scaleX(index)} y={HEIGHT - 8} className="cashflow-chart__tick" textAnchor="middle">
            {yearLabels[index]}
          </text>
        ))}

        {balanceTicks.map((tick) => (
          <text
            key={`balance-tick-${tick}`}
            x={PADDING.left - 8}
            y={scaleBalanceY(tick) + AXIS_LABEL_STACK_OFFSET}
            className="cashflow-chart__axis-label cashflow-chart__axis-label--primary"
            textAnchor="end"
            dominantBaseline="middle"
          >
            {formatCurrencyCompact(tick)}
          </text>
        ))}

        {hoverIndex !== null && hoverX !== null && count > 0 && (
          <g className="cashflow-chart__hover">
            <line x1={hoverX} x2={hoverX} y1={PADDING.top} y2={HEIGHT - PADDING.bottom} className="cashflow-chart__crosshair" />
            <circle cx={hoverX} cy={scaleBalanceY(minimumOnlyBalances[hoverIndex])} r={4} className="cashflow-chart__point cashflow-chart__point--primary" />
            {hasExtraBudget && (
              <circle
                cx={hoverX}
                cy={scaleBalanceY(withStrategyBalances[hoverIndex])}
                r={4}
                className="cashflow-chart__point cashflow-chart__point--unallocated"
              />
            )}
            <g transform={`translate(${tooltipX}, ${PADDING.top})`} className="cashflow-chart__tooltip">
              <rect width={TOOLTIP_WIDTH} height={tooltipHeight} rx={8} className="cashflow-chart__tooltip-box" />
              <text x={10} y={TOOLTIP_TOP_PADDING} className="cashflow-chart__tooltip-title">
                {yearLabels[hoverIndex]}
              </text>
              {tooltipRows.map((row, index) => (
                <text
                  key={row.className}
                  x={10}
                  y={TOOLTIP_TOP_PADDING + (index + 1) * TOOLTIP_ROW_HEIGHT}
                  className={`cashflow-chart__tooltip-row cashflow-chart__tooltip-row--${row.className}`}
                >
                  {row.text}
                </text>
              ))}
            </g>
          </g>
        )}
      </svg>
      <div className="cashflow-chart__legend">
        <span className="cashflow-chart__legend-item">
          <span className="cashflow-chart__swatch cashflow-chart__swatch--primary" /> Minimums only
        </span>
        {hasExtraBudget && (
          <span className="cashflow-chart__legend-item">
            <span className="cashflow-chart__swatch cashflow-chart__swatch--unallocated" /> With strategy
          </span>
        )}
      </div>
    </div>
  );
}
