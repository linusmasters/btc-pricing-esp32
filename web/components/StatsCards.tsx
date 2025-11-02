'use client';

interface Stats {
  current_price: string;
  high: string;
  low: string;
  variation: string;
  variation_percent: string;
}

interface StatsCardsProps {
  stats: Stats | null;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-900 rounded-lg p-6 border border-gray-800 animate-pulse">
            <div className="h-4 bg-gray-800 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-800 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  const currentPrice = parseFloat(stats.current_price || '0');
  const high = parseFloat(stats.high || '0');
  const low = parseFloat(stats.low || '0');
  const variation = parseFloat(stats.variation || '0');
  const variationPercent = parseFloat(stats.variation_percent || '0');

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const cards = [
    {
      title: 'Preço Atual',
      value: `$${formatPrice(currentPrice)}`,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-800',
    },
    {
      title: 'Máxima Hoje',
      value: `$${formatPrice(high)}`,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-800',
    },
    {
      title: 'Mínima Hoje',
      value: `$${formatPrice(low)}`,
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-800',
    },
    {
      title: 'Variação',
      value: `${variationPercent >= 0 ? '+' : ''}${variationPercent.toFixed(2)}%`,
      subtitle: `$${formatPrice(variation)}`,
      color: variationPercent >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: variationPercent >= 0 ? 'bg-green-900/20' : 'bg-red-900/20',
      borderColor: variationPercent >= 0 ? 'border-green-800' : 'border-red-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`${card.bgColor} ${card.borderColor} rounded-lg p-6 border transition-all hover:scale-105`}
        >
          <p className="text-sm text-gray-400 mb-2">{card.title}</p>
          <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          {card.subtitle && (
            <p className="text-sm text-gray-500 mt-1">{card.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}
