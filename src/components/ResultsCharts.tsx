import type { SchemeResult, SimulationConfig } from "../model/types";

interface ResultsChartsProps {
  results: SchemeResult[];
  config: SimulationConfig;
}

function formatProbability(value: number): string {
  if (value === 0) {
    return "0";
  }

  if (value < 0.0001) {
    return value.toExponential(1);
  }

  return value.toFixed(value < 0.01 ? 4 : 3);
}

function BarChart({
  title,
  description,
  results,
  valueFor,
  formatValue,
  labelFor,
  color,
  maximum,
}: {
  title: string;
  description: string;
  results: SchemeResult[];
  valueFor: (result: SchemeResult) => number;
  formatValue: (value: number) => string;
  labelFor?: (result: SchemeResult) => string;
  color: string;
  maximum: number;
}) {
  const chartWidth = 680;
  const leftPadding = 160;
  const rightPadding = 90;
  const chartHeight = Math.max(230, results.length * 52 + 35);
  const plotWidth = chartWidth - leftPadding - rightPadding;

  return (
    <section className="chart-card" aria-label={title}>
      <div className="chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="chart-scroll">
        <svg
          className="bar-chart"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label={`${title}. ${results
            .map((result) => `${result.schemeName}: ${formatValue(valueFor(result))}`)
            .join("; ")}`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const x = leftPadding + plotWidth * fraction;

            return (
              <g key={fraction}>
                <line
                  x1={x}
                  y1="8"
                  x2={x}
                  y2={chartHeight - 22}
                  className="chart-grid-line"
                />
                <text x={x} y={chartHeight - 5} textAnchor="middle" className="chart-axis-label">
                  {formatValue(maximum * fraction)}
                </text>
              </g>
            );
          })}
          {results.map((result, index) => {
            const value = valueFor(result);
            const barWidth = maximum === 0 ? 0 : Math.min(value / maximum, 1) * plotWidth;
            const y = 18 + index * 52;
            const labelX = leftPadding + Math.max(barWidth, 0) + 10;

            return (
              <g key={result.schemeId}>
                <text x={leftPadding - 12} y={y + 17} textAnchor="end" className="chart-row-label">
                  {result.schemeName}
                </text>
                <rect
                  x={leftPadding}
                  y={y}
                  width={barWidth}
                  height="24"
                  rx="6"
                  fill={color}
                  className="chart-bar"
                />
                <text
                  x={Math.min(labelX, chartWidth - 8)}
                  y={y + 17}
                  textAnchor={labelX >= chartWidth - 8 ? "end" : "start"}
                  className="chart-value-label"
                >
                  {labelFor ? labelFor(result) : formatValue(value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

export default function ResultsCharts({ results, config }: ResultsChartsProps) {
  const missedErrorProbability = (result: SchemeResult) =>
    result.undetectedErrors / config.trials;
  const detectionRate = (result: SchemeResult) =>
    result.corruptedFrames === 0 ? 0 : result.detectedErrors / result.corruptedFrames;
  const missedErrorMaximum = Math.max(...results.map(missedErrorProbability), 0.0001);

  return (
    <div className="charts-grid">
      <BarChart
        title="Undetected errors per transmitted frame"
        description="Smaller is better. A value of 0 means no undetected corruptions occurred in these trials."
        results={results}
        valueFor={missedErrorProbability}
        formatValue={formatProbability}
        color="#df715f"
        maximum={missedErrorMaximum}
      />
      <BarChart
        title="Detection rate among corrupted frames"
        description="The proportion of frames with at least one error that the scheme flagged."
        results={results}
        valueFor={detectionRate}
        formatValue={(value) => `${(value * 100).toFixed(2)}%`}
        labelFor={(result) =>
          result.corruptedFrames === 0
            ? "N/A"
            : `${((result.detectedErrors / result.corruptedFrames) * 100).toFixed(2)}%`
        }
        color="#398a78"
        maximum={1}
      />
    </div>
  );
}
