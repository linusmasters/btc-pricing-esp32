'use client';

import { useState, useEffect } from 'react';
import PriceChart from '@/components/PriceChart';
import TickList from '@/components/TickList';
import StatsCards from '@/components/StatsCards';
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

interface Stats {
  current_price: string;
  high: string;
  low: string;
  variation: string;
  variation_percent: string;
}

interface ChartDataPoint {
  time: string;
  price: number;
  formattedTime: string;
}

export default function Home() {
  const [latestTicks, setLatestTicks] = useState<Tick[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);

      // Fetch latest ticks
      const ticksRes = await fetch('/api/ticks?limit=10');
      if (!ticksRes.ok) throw new Error('Failed to fetch ticks');
      const ticksData = await ticksRes.json();
      setLatestTicks(ticksData.ticks || []);

      // Fetch today's data for chart
      const todayRes = await fetch('/api/ticks?type=today');
      if (!todayRes.ok) throw new Error('Failed to fetch today data');
      const todayData = await todayRes.json();

      const chartPoints: ChartDataPoint[] = (todayData.ticks || []).map((tick: Tick) => ({
        time: format(new Date(tick.ts), 'HH:mm', { locale: ptBR }),
        price: parseFloat(tick.price),
        formattedTime: format(new Date(tick.ts), 'HH:mm:ss - dd/MM/yyyy', { locale: ptBR })
      }));
      setChartData(chartPoints);

      // Fetch stats
      const statsRes = await fetch('/api/ticks?type=stats');
      if (!statsRes.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsRes.json();
      setStats(statsData.stats || null);

      setLastUpdate(new Date());
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Bitcoin Price Monitor
              </h1>
              <p className="text-gray-400">
                Monitoramento em tempo real via ESP32 + MQTT
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Atualiza a cada 10s</span>
              </div>
              {lastUpdate && (
                <p className="text-xs text-gray-500 mt-1">
                  Última atualização: {format(lastUpdate, 'HH:mm:ss', { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-400">
              Erro ao carregar dados: {error}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Verifique se o banco de dados está rodando e acessível.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-gray-700 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Carregando dados...</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && !error && (
          <>
            {/* Stats Cards */}
            <StatsCards stats={stats} />

            {/* Chart */}
            <div className="mb-6">
              <PriceChart data={chartData} />
            </div>

            {/* Ticks Table */}
            <TickList ticks={latestTicks} />
          </>
        )}

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-gray-800 text-center text-sm text-gray-500">
          <p>
            Dados fornecidos por ESP32 → EMQX → PostgreSQL
          </p>
          <p className="mt-1">
            Fonte: Binance API | Framework: Next.js 14 + TypeScript + TailwindCSS
          </p>
        </footer>
      </div>
    </div>
  );
}
