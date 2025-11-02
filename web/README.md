# Bitcoin Price Monitor - Web Dashboard

Dashboard web moderno para monitoramento em tempo real dos preços do Bitcoin coletados pelo ESP32.

## Stack Tecnológica

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **TailwindCSS** - Estilização moderna
- **Recharts** - Gráficos interativos
- **PostgreSQL** - Banco de dados (via node-postgres)
- **date-fns** - Manipulação de datas

## Funcionalidades

### Requisitos Funcionais
- ✅ Listar todas as cotações com detalhes de data e hora
- ✅ Exibir gráfico com variação do preço no dia atual
- ✅ Cards com estatísticas (preço atual, máxima, mínima, variação)

### Requisitos Não-Funcionais
- ✅ Atualização automática a cada 10 segundos
- ✅ Lista apenas as 10 últimas cotações
- ✅ Interface responsiva e moderna
- ✅ Tratamento de erros e estados de loading

## Instalação

### Pré-requisitos

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** ou **yarn** (vem com Node.js)
- **PostgreSQL** rodando (via Docker Compose do projeto principal)

### Passo a Passo

```bash
# Navegar para a pasta web
cd web

# Instalar dependências
npm install
# ou
yarn install

# Criar arquivo de variáveis de ambiente
cp .env.local.example .env.local

# Editar .env.local com suas configurações
# (as configurações padrão já funcionam com o docker-compose)
```

### Configurar Variáveis de Ambiente

Edite o arquivo `.env.local`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iot
DB_USER=emqx
DB_PASSWORD=emqxpass
```

**IMPORTANTE:**
- Se o PostgreSQL estiver rodando via Docker Compose, use `DB_HOST=localhost`
- Se estiver em produção ou outro servidor, ajuste o `DB_HOST` conforme necessário

## Executar

### Modo Desenvolvimento

```bash
npm run dev
# ou
yarn dev
```

Acesse: http://localhost:3000

### Modo Produção

```bash
# Build
npm run build

# Start
npm start
```

## Estrutura do Projeto

```
web/
├── app/
│   ├── api/
│   │   └── ticks/
│   │       └── route.ts          # API Routes (endpoints)
│   ├── globals.css               # Estilos globais
│   ├── layout.tsx                # Layout principal
│   └── page.tsx                  # Página principal (dashboard)
├── components/
│   ├── PriceChart.tsx            # Componente do gráfico
│   ├── StatsCards.tsx            # Cards de estatísticas
│   └── TickList.tsx              # Tabela de cotações
├── lib/
│   └── db.ts                     # Conexão e queries PostgreSQL
├── .env.local.example            # Exemplo de variáveis de ambiente
├── package.json                  # Dependências do projeto
├── tailwind.config.ts            # Configuração TailwindCSS
└── tsconfig.json                 # Configuração TypeScript
```

## API Endpoints

A aplicação expõe os seguintes endpoints internos:

### `GET /api/ticks`
Retorna as últimas cotações

**Query Parameters:**
- `limit` (opcional): número de registros (padrão: 10)

**Exemplo:**
```bash
curl http://localhost:3000/api/ticks?limit=10
```

**Resposta:**
```json
{
  "ticks": [
    {
      "id": 123,
      "ts": "2025-01-15T10:30:00Z",
      "symbol": "BTCUSDT",
      "price": "98765.43",
      "topic": "esp32/btc/price/json",
      "clientid": "esp32-btc-oled",
      "raw": { ... }
    }
  ]
}
```

### `GET /api/ticks?type=today`
Retorna todas as cotações do dia atual (para o gráfico)

**Exemplo:**
```bash
curl http://localhost:3000/api/ticks?type=today
```

### `GET /api/ticks?type=stats`
Retorna estatísticas do dia

**Resposta:**
```json
{
  "stats": {
    "current_price": "98765.43",
    "high": "99000.00",
    "low": "97500.00",
    "variation": "1500.00",
    "variation_percent": "1.54"
  }
}
```

## Componentes Principais

### `PriceChart.tsx`
Gráfico de linha interativo mostrando a variação do preço durante o dia.

**Features:**
- Tooltip customizado
- Formatação de valores em USD
- Eixos com labels formatados
- Responsivo

### `StatsCards.tsx`
Cards com métricas importantes:
- Preço atual
- Máxima do dia
- Mínima do dia
- Variação percentual

### `TickList.tsx`
Tabela com as últimas 10 cotações, mostrando:
- Data e hora formatadas
- Símbolo (badge)
- Preço formatado
- Cliente MQTT
- Tópico MQTT

### `page.tsx`
Página principal que:
- Busca dados de 3 endpoints diferentes
- Atualiza automaticamente a cada 10s
- Gerencia estados de loading e erro
- Renderiza todos os componentes

## Customização

### Alterar Intervalo de Atualização

Edite `app/page.tsx` linha ~75:

```typescript
// De 10 segundos para 5 segundos
const interval = setInterval(fetchData, 5000);
```

### Alterar Número de Cotações na Tabela

Edite `app/page.tsx` linha ~51:

```typescript
// De 10 para 20 registros
const ticksRes = await fetch('/api/ticks?limit=20');
```

### Cores do Tema

Edite `app/globals.css`:

```css
:root {
  --background: #0a0a0a;    /* Cor de fundo */
  --foreground: #ededed;    /* Cor do texto */
}
```

Ou customize diretamente no TailwindCSS nos componentes.

## Troubleshooting

### Erro: "Failed to fetch data from database"

**Causa:** Não consegue conectar ao PostgreSQL

**Solução:**
1. Verifique se o PostgreSQL está rodando:
   ```bash
   docker ps | grep pg
   ```
2. Teste a conexão:
   ```bash
   docker exec -it pg psql -U emqx -d iot -c "SELECT COUNT(*) FROM btc_ticks;"
   ```
3. Verifique as variáveis de ambiente no `.env.local`

### Erro: "Module not found"

**Causa:** Dependências não instaladas

**Solução:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Página em branco ou "Nenhuma cotação disponível"

**Causa:** Banco vazio ou ESP32 não está publicando

**Solução:**
1. Verifique se há dados no banco:
   ```sql
   SELECT COUNT(*) FROM btc_ticks;
   ```
2. Verifique se o ESP32 está conectado ao EMQX
3. Verifique se a Rule no EMQX está ativa

### Gráfico não aparece

**Causa:** Nenhuma cotação do dia atual

**Solução:**
- Aguarde o ESP32 publicar dados (a cada 60s)
- Ou insira dados manualmente para teste:
  ```sql
  INSERT INTO btc_ticks (symbol, price, raw, topic, clientid, ts)
  VALUES ('BTCUSDT', 98765.43, '{"test": true}', 'test', 'test', NOW());
  ```

## Performance

### Otimizações Implementadas

- ✅ Connection pooling no PostgreSQL
- ✅ Índices no banco para queries rápidas
- ✅ Limite de registros nas queries
- ✅ Client-side caching via React state
- ✅ Auto-refresh inteligente (não re-renderiza se não houver mudanças)

### Recomendações para Produção

1. **Habilitar cache HTTP:**
   ```typescript
   // Em app/api/ticks/route.ts
   export const revalidate = 10; // Cache de 10s
   ```

2. **Usar variáveis de ambiente seguras:**
   - Nunca commite `.env.local`
   - Use secrets do provedor (Vercel, AWS, etc.)

3. **Adicionar rate limiting:**
   ```bash
   npm install @upstash/ratelimit
   ```

4. **Monitoramento:**
   - Adicione logs estruturados
   - Integre com Sentry ou similar

## Próximas Melhorias

- [ ] Autenticação de usuários
- [ ] Filtros por período (última hora, 24h, 7 dias)
- [ ] Export para CSV/Excel
- [ ] Notificações push quando preço atingir threshold
- [ ] Dark/Light mode toggle
- [ ] Comparação entre múltiplas criptomoedas
- [ ] Dashboard com WebSockets para updates em tempo real
- [ ] PWA (Progressive Web App)

## Licença

MIT
