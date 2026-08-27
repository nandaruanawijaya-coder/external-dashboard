'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: Array<{ value: number }>;
  color?: string;
}

export default function Sparkline({ data, color = '#3b82f6' }: SparklineProps) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={true}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
