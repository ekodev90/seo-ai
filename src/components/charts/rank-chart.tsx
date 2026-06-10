"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceDot,
} from "recharts";

interface RankPoint {
  date: string;
  mobile: number | null; // inverted: null = not in top 100
  desktop: number | null;
  aiOverviewPresent?: boolean;
}

interface RankChartProps {
  data: RankPoint[];
  keyword: string;
}

export function RankChart({ data, keyword }: RankChartProps) {
  if (!data.length) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        No rank data yet. Add keywords and run a rank check.
      </div>
    );
  }

  // Invert Y-axis: position 1 (top) should be at the top of the chart
  // We invert values so 1=100, 100=0, not in top 100 = 0
  const chartData = data.map((d) => ({
    ...d,
    mobileRank: d.mobile ? 101 - d.mobile : 0,
    desktopRank: d.desktop ? 101 - d.desktop : 0,
  }));

  return (
    <div className="w-full">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Rank History: {keyword}
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            tickFormatter={(v: string) => {
              const d = new Date(v);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            tickFormatter={(v: number) => (v > 0 ? `${101 - v}` : "100+")}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(value, name) => {
              const v = Number(value);
              const pos = v > 0 ? `${101 - v}` : "100+";
              return [pos, name === "mobileRank" ? "Mobile" : "Desktop"];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value: string) => (value === "mobileRank" ? "Mobile" : "Desktop")}
          />
          <Line
            type="monotone"
            dataKey="mobileRank"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            name="mobileRank"
          />
          <Line
            type="monotone"
            dataKey="desktopRank"
            stroke="#9ca3af"
            strokeWidth={1.5}
            dot={{ r: 2 }}
            strokeDasharray="4 3"
            name="desktopRank"
          />
          {/* AI Overview markers */}
          {chartData
            .filter((d) => d.aiOverviewPresent)
            .map((d, i) => (
              <ReferenceDot
                key={i}
                x={d.date}
                y={95}
                r={4}
                fill="#8b5cf6"
                stroke="#fff"
                strokeWidth={1}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-2 text-center">
        Mobile rank emphasized (solid blue) · Purple dots = AI Overview present
      </p>
    </div>
  );
}
