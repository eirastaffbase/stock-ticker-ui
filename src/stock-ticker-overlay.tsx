/*!
 * Copyright 2024, Staffbase GmbH and contributors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { ReactElement, useState, useEffect, useId } from "react";
import { BlockAttributes } from "widget-sdk";
import { useContainerSize } from "./useContainerSize";

export interface StockTickerOverlayProps extends BlockAttributes {
  symbol: string;
  weeks: number;
  logo: string;
  stockgraphcolor: string;
}

export const StockTickerOverlay = ({
  symbol,
  weeks,
  stockgraphcolor,
}: StockTickerOverlayProps): ReactElement => {
  const [containerRef] = useContainerSize<HTMLDivElement>();
  const [graphRowRef, graphRowSize] = useContainerSize<HTMLDivElement>();

  // Base sizing; graph scales with container width
  const fontSize = "1rem";
  const svgHeight = 160;
  const dailyChangeFontSize = "0.85rem";

  // State for stock data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closingPrices, setClosingPrices] = useState<number[]>([]);
  const [closingDates, setClosingDates] = useState<string[]>([]);
  const [latestClose, setLatestClose] = useState<number | null>(null);
  const [isGraphHover, setIsGraphHover] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    price: number;
    date: string;
  } | null>(null);
  const gradientId = useId();

  // Polygon.io config
  const apiKey = "peVSYdi2zmCBJYWXc0pe0d_B0FP6dXO7";
  const fallbackClosingPrices2 = [
    141, 132, 147, 159, 163, 154, 120, 175, 160.02, 185.06,
  ];
  const fallbackClosingPrices4 = [
    120, 123, 127, 124, 130, 134, 132, 138, 136, 140, 143, 141, 145, 149, 147,
    151, 154, 152, 156, 160, 158, 162, 165, 163, 168, 171, 169, 173.2,
  ];
  const baseWeeks = weeks || 4;
  const toggleWeeks = baseWeeks === 2 ? 4 : 2;
  const [activeWeeks, setActiveWeeks] = useState(baseWeeks);

  useEffect(() => {
    setActiveWeeks(baseWeeks);
  }, [baseWeeks]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // Bypass API if symbol is "VNI" for demo
      if (symbol === "VNI") {
        const fallbackPrices =
          activeWeeks === 4 ? fallbackClosingPrices4 : fallbackClosingPrices2;
        const fallbackDates = buildFallbackDates(fallbackPrices.length);
        setClosingPrices(fallbackPrices);
        setClosingDates(fallbackDates);
        setLatestClose(fallbackPrices[fallbackPrices.length - 1]);
        setLoading(false);
        return;
      }

      try {
        // Fetch ticker details
        const detailsUrl = `https://api.polygon.io/v3/reference/tickers/${symbol}?apiKey=${apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        if (!detailsResponse.ok) {
          throw new Error(`HTTP error! Status: ${detailsResponse.status}`);
        }
        await detailsResponse.json();

        // Prepare date range for aggregator
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - activeWeeks * 7);
        const endDateStr = today.toISOString().split("T")[0];
        const startDateStr = startDate.toISOString().split("T")[0];

        const aggsUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDateStr}/${endDateStr}?adjusted=true&sort=asc&apiKey=${apiKey}`;
        const aggsResponse = await fetch(aggsUrl);
        if (!aggsResponse.ok) {
          throw new Error(`HTTP error! Status: ${aggsResponse.status}`);
        }
        const aggsData = await aggsResponse.json();

        if (aggsData.results?.length) {
          const closes = aggsData.results.map((r: any) => r.c);
          const dates = aggsData.results.map((r: any) =>
            new Date(r.t).toISOString().split("T")[0]
          );

          setClosingPrices(closes);
          setClosingDates(dates);

          const lastClose = closes[closes.length - 1];
          setLatestClose(lastClose);
        } else {
          throw new Error("No results found in Polygon daily aggregates.");
        }
      } catch (error) {
        console.error("Error fetching data:", error);

        // Fallback
        const fallbackPrices =
          activeWeeks === 4 ? fallbackClosingPrices4 : fallbackClosingPrices2;
        setClosingPrices(fallbackPrices);
        setClosingDates(buildFallbackDates(fallbackPrices.length));
        setLatestClose(
          fallbackPrices[fallbackPrices.length - 1]
        );
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, activeWeeks]);

  // Generate smooth SVG path
  const graphBaseWidth = 200;
  const graphBaseHeight = 140;
  const graphBaselineInset = 20;
  const graphTopPadding = 6;
  const generateSvgPath = (prices: number[]): string => {
    if (!prices || prices.length < 2) return "";

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const graphInnerHeight =
      graphBaseHeight - graphBaselineInset - graphTopPadding;
    const stepX = graphBaseWidth / (prices.length - 1);

    const points = prices.map((price, i) => {
      const x = i * stepX;
      const y =
        graphTopPadding +
        graphInnerHeight -
        ((price - minPrice) / priceRange) * graphInnerHeight;
      return { x, y };
    });

    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      const cp0 = { x: cpX, y: p0.y };
      const cp1 = { x: cpX, y: p1.y };
      pathD += ` C ${cp0.x},${cp0.y} ${cp1.x},${cp1.y} ${p1.x},${p1.y}`;
    }

    return pathD;
  };

  const generateSvgAreaPath = (prices: number[]): string => {
    if (!prices || prices.length < 2) return "";

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const graphInnerHeight =
      graphBaseHeight - graphBaselineInset - graphTopPadding;
    const stepX = graphBaseWidth / (prices.length - 1);

    const points = prices.map((price, i) => {
      const x = i * stepX;
      const y =
        graphTopPadding +
        graphInnerHeight -
        ((price - minPrice) / priceRange) * graphInnerHeight;
      return { x, y };
    });

    let areaD = `M ${points[0].x},${graphBaseHeight} L ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const cpX = (p0.x + p1.x) / 2;
      const cp0 = { x: cpX, y: p0.y };
      const cp1 = { x: cpX, y: p1.y };
      areaD += ` C ${cp0.x},${cp0.y} ${cp1.x},${cp1.y} ${p1.x},${p1.y}`;
    }
    areaD += ` L ${points[points.length - 1].x},${graphBaseHeight} Z`;

    return areaD;
  };

  const getGraphPoints = (prices: number[], dates: string[]) => {
    if (!prices || prices.length < 2) return [];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const graphInnerHeight =
      graphBaseHeight - graphBaselineInset - graphTopPadding;
    const stepX = graphBaseWidth / (prices.length - 1);

    return prices.map((price, i) => {
      const x = i * stepX;
      const y =
        graphTopPadding +
        graphInnerHeight -
        ((price - minPrice) / priceRange) * graphInnerHeight;
      return {
        x,
        y,
        price,
        date: dates[i] || "",
      };
    });
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return "";
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatDateNumeric = (dateStr: string) => {
    if (!dateStr) return "";
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
  };

  // Price change
  let rangeChange: number | null = null;
  if (closingPrices.length > 1) {
    rangeChange =
      closingPrices[closingPrices.length - 1] - closingPrices[0];
  }
  const changeColor =
    rangeChange !== null && rangeChange >= 0 ? "#6CD28D" : "#ef4444";
  const changePercent =
    rangeChange !== null && closingPrices.length > 1
      ? (rangeChange / (closingPrices[0] || 1)) * 100
      : null;
  const startDateLabel = closingDates.length
    ? formatDateNumeric(closingDates[0])
    : "";
  const sinceLabel = startDateLabel ? `since ${startDateLabel}` : "since start";

  // Graph color: use the user-specified color, or default to green or red based on change
  const graphColor = stockgraphcolor || changeColor;

  // Styles
  const containerStyle: React.CSSProperties = {
    padding: "1rem 0.5rem 0.5rem",
    width: "100%",
    boxSizing: "border-box",
    minHeight: "80px",
    fontSize,
    fontFamily: "\"Space Grotesk\", \"Helvetica Neue\", Arial, sans-serif",
    color: "#f8fafc",
  };

  const graphRowStyle: React.CSSProperties = {
    width: "100%",
    marginTop: "0.4rem",
    position: "relative",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.15rem",
    fontSize,
  };

  const headerRowStyle: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "0.5rem",
  };

  const svgStyle: React.CSSProperties = {
    marginTop: "0px",
    transition: "transform 160ms ease, filter 160ms ease",
    transform: isGraphHover ? "translateY(-2px)" : "translateY(0)",
    filter: isGraphHover ? "drop-shadow(0 6px 12px rgba(0,0,0,0.12))" : "none",
    cursor: "pointer",
  };

  const priceInfoStyle: React.CSSProperties = {
    textAlign: "left",
    lineHeight: "1.3em",
  };

  const hoverRadius = 3;
  const graphScaleX = graphRowSize.width
    ? graphRowSize.width / graphBaseWidth
    : 1;
  const graphScaleY = graphBaseHeight
    ? svgHeight / graphBaseHeight
    : 1;
  const hoverRadiusX = hoverRadius / graphScaleX;
  const hoverRadiusY = hoverRadius / graphScaleY;

  return (
    <div ref={containerRef} className="stockwidget-container" style={containerStyle}>
      <div className="stockwidget-header" style={headerStyle}>
        <div className="stockwidget-headerRow" style={headerRowStyle}>
          <div className="stockwidget-price" style={priceInfoStyle}>
            {latestClose !== null && (
              <div
                style={{
                  fontSize,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ${latestClose.toFixed(2)}
              </div>
            )}
          </div>
          <div
            className="stockwidget-symbol"
            style={{
              fontWeight: 600,
              letterSpacing: "-0.01em",
              textAlign: "right",
            }}
          >
            {symbol}
          </div>
        </div>
        {rangeChange !== null && (
          <div
            style={{
              color: "#f8fafc",
              fontSize: dailyChangeFontSize,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              aria-hidden="true"
              focusable="false"
              style={{ display: "block" }}
            >
              <polygon
                points={rangeChange >= 0 ? "5,0 10,10 0,10" : "0,0 10,0 5,10"}
                fill={changeColor}
              />
            </svg>
            {changePercent !== null && (
              <span style={{ color: changeColor }}>
                {rangeChange >= 0 ? "+" : "-"}
                {Math.abs(changePercent).toFixed(2)}%
              </span>
            )}
            <span style={{ fontWeight: 400, color: "rgba(248, 250, 252, 0.72)" }}>
              {sinceLabel}
            </span>
          </div>
        )}
        {loading && <div>Loading data...</div>}
      </div>
      <div
        ref={graphRowRef}
        className="stockwidget-graphRow"
        style={graphRowStyle}
      >
        {closingPrices.length > 1 && (
          <svg
            className="stockwidget-chart"
            width="100%"
            height={svgHeight}
            viewBox="0 0 200 160"
            preserveAspectRatio="none"
            style={{ ...svgStyle, display: "block" }}
            onMouseEnter={() => setIsGraphHover(true)}
            onMouseLeave={() => {
              setIsGraphHover(false);
              setHoveredIndex(null);
              setTooltip(null);
            }}
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const x = event.clientX - rect.left;
              const scaledX = (x / rect.width) * graphBaseWidth;
              const points = getGraphPoints(closingPrices, closingDates);
              if (!points.length) return;
              const step = graphBaseWidth / (points.length - 1);
              const index = Math.max(
                0,
                Math.min(points.length - 1, Math.round(scaledX / step))
              );
              setHoveredIndex(index);
              const point = points[index];
              if (!point) return;
              setTooltip({
                x: (point.x / graphBaseWidth) * rect.width,
                y: (point.y / graphBaseHeight) * rect.height,
                price: point.price,
                date: point.date,
              });
            }}
            onClick={() =>
              setActiveWeeks((current) =>
                current === baseWeeks ? toggleWeeks : baseWeeks
              )
            }
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop
                  offset="0%"
                  stopColor={graphColor}
                  stopOpacity={isGraphHover ? 0.35 : 0.22}
                />
                <stop
                  offset="60%"
                  stopColor={graphColor}
                  stopOpacity={isGraphHover ? 0.5 : 0.35}
                />
                <stop
                  offset="100%"
                  stopColor={graphColor}
                  stopOpacity={isGraphHover ? 0.7 : 0.55}
                />
              </linearGradient>
            </defs>
            <path
              d={generateSvgAreaPath(closingPrices)}
              fill={`url(#${gradientId})`}
            />
            <path
              d={generateSvgPath(closingPrices)}
              stroke={graphColor}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {(() => {
              const points = getGraphPoints(closingPrices, closingDates);
              if (hoveredIndex === null || !points[hoveredIndex]) return null;
              const point = points[hoveredIndex];
              return (
                <ellipse
                  cx={point.x}
                  cy={point.y}
                  rx={hoverRadiusX}
                  ry={hoverRadiusY}
                  fill="#ffffff"
                />
              );
            })()}
          </svg>
        )}
        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: tooltip.x,
              top: tooltip.y,
              transform:
                tooltip.y < 28
                  ? "translate(-50%, 10px)"
                  : "translate(-50%, -110%)",
              background: "#ffffff",
              color: "#0f172a",
              borderRadius: "12px",
              padding: "6px 8px",
              fontSize: "11px",
              fontWeight: 600,
              lineHeight: "1.1",
              textAlign: "center",
              minWidth: "64px",
              maxWidth: "110px",
              boxShadow: "0 8px 18px rgba(15, 23, 42, 0.12)",
              border: "1px solid rgba(15, 23, 42, 0.08)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ fontVariantNumeric: "tabular-nums" }}>
              ${tooltip.price.toFixed(2)}
            </div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 500,
                color: "#475569",
                marginTop: "2px",
              }}
            >
              {formatDateShort(tooltip.date)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
  const buildFallbackDates = (length: number) => {
    const today = new Date();
    const dates: string[] = [];
    for (let i = length - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  };
