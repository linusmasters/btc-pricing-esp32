'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChartDataPoint {
  time: string;
  price: number;
  formattedTime: string;
}

interface PriceChartProps {
  data: ChartDataPoint[];
}

export default function PriceChart({ data }: PriceChartProps) {
  const formatYAxis = (value: number) => {
    return `$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm text-gray-300">{payload[0].payload.formattedTime}</p>
          <p className="text-lg font-bold text-green-400">
            ${payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px] bg-gray-900 rounded-lg p-6 border border-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-gray-100">Variação do Preço - Hoje</h2>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          Aguardando dados...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              domain={['dataMin - 100', 'dataMax + 100']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#9CA3AF' }} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', r: 3 }}
              activeDot={{ r: 6 }}
              name="Preço BTC"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
