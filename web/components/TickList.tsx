'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Tick {
  id: number;
  ts: string;
  symbol: string;
  price: string;
  clientid: string | null;
  topic: string;
}

interface TickListProps {
  ticks: Tick[];
}

export default function TickList({ ticks }: TickListProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: format(date, "dd/MM/yyyy", { locale: ptBR }),
        time: format(date, "HH:mm:ss", { locale: ptBR })
      };
    } catch {
      return { date: 'N/A', time: 'N/A' };
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <h2 className="text-xl font-semibold text-gray-100">Últimas 10 Cotações</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800 text-gray-300 text-sm">
            <tr>
              <th className="px-6 py-3 text-left font-medium">Data</th>
              <th className="px-6 py-3 text-left font-medium">Hora</th>
              <th className="px-6 py-3 text-left font-medium">Símbolo</th>
              <th className="px-6 py-3 text-right font-medium">Preço (USD)</th>
              <th className="px-6 py-3 text-left font-medium">Cliente</th>
              <th className="px-6 py-3 text-left font-medium">Tópico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {ticks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma cotação disponível
                </td>
              </tr>
            ) : (
              ticks.map((tick, index) => {
                const { date, time } = formatDate(tick.ts);
                const priceNum = parseFloat(tick.price);

                return (
                  <tr
                    key={tick.id}
                    className={`${
                      index === 0 ? 'bg-gray-800/50' : 'hover:bg-gray-800/30'
                    } transition-colors`}
                  >
                    <td className="px-6 py-4 text-gray-300 text-sm">{date}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm font-mono">{time}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-900/30 text-orange-400 border border-orange-700">
                        {tick.symbol}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-lg font-semibold text-green-400">
                        ${priceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm font-mono">
                      {tick.clientid || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs font-mono">
                      {tick.topic}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {ticks.length > 0 && (
        <div className="px-6 py-3 bg-gray-800/50 border-t border-gray-800 text-sm text-gray-400">
          Total: {ticks.length} cotações
        </div>
      )}
    </div>
  );
}
