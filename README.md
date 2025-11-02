# Bitcoin Price Monitor - ESP32 + MQTT + PostgreSQL

Monitor de preço do Bitcoin em tempo real usando ESP32 com display OLED, publicando dados via MQTT (EMQX) e armazenando em PostgreSQL.

## Arquitetura do Sistema

```
┌─────────────┐     HTTPS      ┌──────────────┐
│   ESP32     │───────────────>│   Binance    │
│   + OLED    │                │     API      │
└──────┬──────┘                └──────────────┘
       │ MQTT
       │ esp32/btc/price/json
       ▼
┌─────────────┐     Rule       ┌──────────────┐
│    EMQX     │───────────────>│  PostgreSQL  │
│   Broker    │    Action      │   Database   │
└─────────────┘                └──────────────┘
```

## Hardware Necessário

- **ESP32** (qualquer modelo com WiFi)
- **Display OLED SSD1306** 128x64 I2C
- Conexões:
  - SDA → GPIO 21
  - SCL → GPIO 22
  - VCC → 3.3V
  - GND → GND

## Bibliotecas Arduino IDE

Instale via Library Manager (`Ctrl+Shift+I`):

1. **Adafruit GFX Library** (by Adafruit)
2. **Adafruit SSD1306** (by Adafruit)
3. **ArduinoJson** (by Benoit Blanchon) - versão 6.x
4. **PubSubClient** (by Nick O'Leary)

As bibliotecas WiFi, HTTPClient e WiFiClientSecure já vêm com o ESP32.

## Configuração do Ambiente

### 1. Subir os Containers Docker

```bash
# Clonar/navegar para o diretório do projeto
cd btc-pricing-esp32

# Subir os serviços (EMQX, PostgreSQL, Adminer)
docker-compose up -d

# Verificar se estão rodando
docker-compose ps
```

Serviços disponíveis:
- **EMQX Dashboard**: http://localhost:18083 (admin/public)
- **Adminer (DB Manager)**: http://localhost:8081
- **MQTT Broker**: localhost:1883
- **PostgreSQL**: localhost:5432
- **Web Dashboard**: http://localhost:3000 (após iniciar - ver passo 5)

### 2. Verificar Criação do Banco

Acesse o Adminer em http://localhost:8081:

- **Sistema**: PostgreSQL
- **Servidor**: postgres
- **Usuário**: emqx
- **Senha**: emqxpass
- **Base de dados**: iot

Você deve ver a tabela `btc_ticks` criada com os índices.

### 3. Configurar o ESP32

#### 3.1. Editar Credenciais WiFi

Abra o arquivo `src/btc_pricing_example/btc_pricing_example.ino` e edite:

```cpp
#define WIFI_SSID     "SUA_REDE_WIFI"
#define WIFI_PASSWORD "SUA_SENHA_WIFI"
```

#### 3.2. Configurar IP do Broker MQTT

Descubra o IP da sua máquina:

**Windows:**
```bash
ipconfig
# Procure por "Endereço IPv4" da sua rede (ex: 192.168.1.100)
```

**Linux/Mac:**
```bash
ifconfig
# ou
ip addr show
```

Edite no código:

```cpp
const char* MQTT_HOST = "192.168.1.100";  // <-- SEU IP AQUI
```

**IMPORTANTE:** Não use `localhost` ou `127.0.0.1` - o ESP32 precisa do IP real da máquina!

#### 3.3. Compilar e Upload

1. Abra o Arduino IDE
2. Selecione a placa:
   - **Tools → Board → ESP32 Arduino → ESP32 Dev Module**
   - **Tools → Port → [Porta COM do ESP32]**
3. Clique em **Upload** (Ctrl+U)
4. Abra o Serial Monitor (Ctrl+Shift+M) em **115200 baud**

### 4. Configurar EMQX Rules & Actions

#### 4.1. Acessar o Dashboard

Acesse http://localhost:18083 e faça login:
- **Usuário**: admin
- **Senha**: public

#### 4.2. Criar a Rule

1. No menu lateral, vá em **Integration → Rules**
2. Clique em **+ Create**
3. Preencha:

**SQL Statement:**
```sql
SELECT
  payload.symbol as symbol,
  payload.price as price,
  payload.ts as esp_ts,
  timestamp as broker_ts,
  topic as topic,
  clientid as clientid,
  payload as raw
FROM
  "esp32/btc/price/json"
```

**Explicação dos campos:**
- `payload.symbol` - Símbolo do par (BTCUSDT)
- `payload.price` - Preço em string
- `payload.ts` - Timestamp do ESP32 (millis)
- `timestamp` - Timestamp do broker EMQX (milissegundos)
- `topic` - Tópico MQTT de origem
- `clientid` - ID do cliente que publicou
- `payload` - JSON completo como JSONB

4. Clique em **Next** ou **Create**

#### 4.3. Adicionar Action PostgreSQL

1. Na mesma tela da Rule, clique em **+ Add Action**
2. Selecione **PostgreSQL** como tipo
3. Configure a conexão:

**PostgreSQL Configuration:**
```
Server: postgres:5432
Database: iot
Username: emqx
Password: emqxpass
```

**SQL Template:**
```sql
INSERT INTO btc_ticks (symbol, price, raw, topic, clientid, ts)
VALUES (
  ${symbol},
  ${price}::numeric,
  ${raw}::jsonb,
  ${topic},
  ${clientid},
  to_timestamp(${broker_ts} / 1000.0)
)
```

**Explicação:**
- `${symbol}` - Substitui pelo valor extraído na Rule
- `${price}::numeric` - Converte string para NUMERIC(18,8)
- `${raw}::jsonb` - Converte objeto JSON para JSONB
- `to_timestamp(${broker_ts} / 1000.0)` - Converte ms para TIMESTAMPTZ

4. Clique em **Create** ou **Confirm**
5. **Teste a conexão** clicando em **Test** antes de salvar

#### 4.4. Verificar Status

- Vá em **Integration → Rules**
- Sua rule deve aparecer com status **Enabled**
- Clique nela para ver estatísticas (mensagens processadas, sucessos, falhas)

### 5. Iniciar o Dashboard Web

O dashboard web permite visualizar os dados em tempo real com gráficos e tabelas.

#### 5.1. Instalar Dependências

```bash
# Navegar para a pasta web
cd web

# Instalar dependências do Node.js (apenas na primeira vez)
npm install
```

**Nota:** Você precisa ter o [Node.js 18+](https://nodejs.org/) instalado.

#### 5.2. Configurar Variáveis de Ambiente

```bash
# Criar arquivo de configuração
cp .env.local.example .env.local
```

O arquivo `.env.local` já vem configurado para funcionar com o Docker Compose:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iot
DB_USER=emqx
DB_PASSWORD=emqxpass
```

**Não é necessário editar** se você está usando as configurações padrão do Docker Compose.

#### 5.3. Iniciar o Dashboard

```bash
# Modo desenvolvimento (recomendado para testes)
npm run dev
```

Aguarde a mensagem:
```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

**Acesse:** http://localhost:3000

#### 5.4. Recursos do Dashboard

**Interface Moderna com:**
- 📊 **4 Cards de Estatísticas**
  - Preço Atual (atualizado em tempo real)
  - Máxima do Dia
  - Mínima do Dia
  - Variação Percentual

- 📈 **Gráfico Interativo**
  - Linha temporal com todas as cotações do dia
  - Tooltip ao passar o mouse
  - Formatação automática de valores
  - Escala dinâmica

- 📋 **Tabela de Cotações**
  - Últimas 10 cotações
  - Data e hora formatadas (padrão brasileiro)
  - Badge do símbolo (BTCUSDT)
  - Cliente e tópico MQTT
  - Destaque para cotação mais recente

- 🔄 **Atualização Automática**
  - Refresh a cada 10 segundos
  - Indicador visual de atualização
  - Timestamp da última atualização

**Para mais detalhes**, consulte [web/README.md](web/README.md)

#### 5.5. Modo Produção (Opcional)

Para deploy em servidor:

```bash
# Build otimizado
npm run build

# Iniciar em modo produção
npm start
```

## Testando o Sistema

### 1. Verificar ESP32

No Serial Monitor, você deve ver:
```
[OK] BTC: 98765.43 | OK 123s
```

No display OLED:
```
BTC/USDT (Binance)
$ 98765.43
Atualiza a cada 60s
OK 123s
```

### 2. Verificar EMQX

No EMQX Dashboard (http://localhost:18083):

1. **Connections → Clients**: Deve aparecer `esp32-btc-oled`
2. **Diagnose → WebSocket Client**:
   - Conecte ao broker
   - Subscribe no tópico `esp32/btc/price/json`
   - Aguarde até 60s para ver as mensagens

Exemplo de mensagem:
```json
{
  "symbol": "BTCUSDT",
  "price": "98765.43",
  "ts": 123456789
}
```

### 3. Verificar PostgreSQL

No Adminer (http://localhost:8081):

```sql
SELECT * FROM btc_ticks ORDER BY ts DESC LIMIT 10;
```

Você deve ver registros com:
- `symbol`: BTCUSDT
- `price`: valor numérico
- `ts`: timestamp correto
- `raw`: JSON completo
- `topic`: esp32/btc/price/json
- `clientid`: esp32-btc-oled

### 4. Verificar Dashboard Web

Após iniciar o dashboard (ver seção "5. Iniciar o Dashboard Web" acima), acesse http://localhost:3000

**O que você verá:**

![Dashboard Preview]

- 📊 **Cards de Estatísticas**: Preço atual, máxima, mínima e variação do dia
- 📈 **Gráfico Interativo**: Linha temporal com todos os preços coletados hoje
- 📋 **Tabela de Cotações**: Últimas 10 cotações com data/hora detalhada
- 🔄 **Atualização Automática**: Dados são atualizados a cada 10 segundos automaticamente

**Estados do Dashboard:**

1. **Loading (Carregando):**
   - Spinner animado enquanto busca dados do banco
   - Aparece apenas no primeiro acesso

2. **Sem Dados:**
   - Mensagem "Aguardando dados..." no gráfico
   - Tabela vazia com texto explicativo
   - Normal quando o sistema acabou de ser iniciado

3. **Com Dados (Normal):**
   - Cards mostram estatísticas em tempo real
   - Gráfico renderiza linha temporal
   - Tabela lista últimas 10 cotações
   - Indicador verde pulsando (atualização ativa)

4. **Erro:**
   - Banner vermelho com mensagem de erro
   - Geralmente indica problema de conexão com o banco
   - Verifique se o PostgreSQL está rodando

**Se não houver dados:**
- ⏱️ Aguarde o ESP32 publicar a primeira cotação (até 60s após ligar)
- ✅ Verifique se a Rule do EMQX está **Enabled** e processando mensagens
- 🔍 Confira se há dados no PostgreSQL com: `SELECT COUNT(*) FROM btc_ticks;`
- 🔌 Certifique-se que o ESP32 está conectado ao MQTT (verifique Serial Monitor)

### 5. Monitorar Logs

```bash
# Logs do EMQX
docker logs -f emqx

# Logs do PostgreSQL
docker logs -f pg

# Ver todas as conexões ativas
docker exec -it pg psql -U emqx -d iot -c "SELECT COUNT(*) FROM btc_ticks;"
```

## Estrutura do Banco de Dados

```sql
CREATE TABLE btc_ticks (
  id        BIGSERIAL PRIMARY KEY,           -- ID auto-incremento
  ts        TIMESTAMPTZ NOT NULL,            -- Timestamp do broker
  symbol    TEXT NOT NULL,                   -- Ex: BTCUSDT
  price     NUMERIC(18,8) NOT NULL,          -- Preço com 8 decimais
  raw       JSONB NOT NULL,                  -- Payload JSON completo
  topic     TEXT NOT NULL,                   -- Tópico MQTT
  clientid  TEXT                             -- ID do cliente
);

-- Índices para otimizar consultas
CREATE INDEX idx_btc_ticks_ts ON btc_ticks(ts DESC);
CREATE INDEX idx_btc_ticks_symbol_ts ON btc_ticks(symbol, ts DESC);
```

## Queries Úteis

```sql
-- Últimos 10 registros
SELECT ts, symbol, price, clientid
FROM btc_ticks
ORDER BY ts DESC
LIMIT 10;

-- Preço médio da última hora
SELECT AVG(price) as avg_price
FROM btc_ticks
WHERE ts > NOW() - INTERVAL '1 hour';

-- Máximo e mínimo de hoje
SELECT
  MAX(price) as high,
  MIN(price) as low,
  MAX(price) - MIN(price) as variation
FROM btc_ticks
WHERE ts >= CURRENT_DATE;

-- Contagem por cliente
SELECT clientid, COUNT(*) as total
FROM btc_ticks
GROUP BY clientid;
```

## Troubleshooting

### ESP32 não conecta ao WiFi
- Verifique SSID e senha
- Confirme que a rede é 2.4GHz (ESP32 não suporta 5GHz)
- Tente reiniciar o ESP32

### ESP32 não conecta ao MQTT
- Verifique se usou o IP correto (não localhost)
- Teste ping do computador para o IP
- Verifique firewall do Windows
- Confirme que o EMQX está rodando: `docker ps`

### Rule não está salvando no banco
- Veja logs da Rule no EMQX Dashboard
- Teste a conexão PostgreSQL na Action
- Verifique se o hostname é `postgres` (nome do container)
- Confirme que o banco está acessível: `docker exec -it pg psql -U emqx -d iot`

### Dados não aparecem no banco
- Verifique se a Rule está **Enabled**
- Veja estatísticas da Rule (Success/Failed)
- Confirme que o ESP32 está publicando no tópico correto
- Use WebSocket Client no EMQX para ver as mensagens

### Dashboard web mostra erro "Failed to fetch data"
- **Causa:** Não consegue conectar ao PostgreSQL
- **Soluções:**
  1. Verifique se o PostgreSQL está rodando: `docker ps | grep pg`
  2. Teste conexão manual: `docker exec -it pg psql -U emqx -d iot -c "SELECT 1;"`
  3. Verifique o arquivo `.env.local` na pasta `web/`
  4. Certifique-se que `DB_HOST=localhost` (não use `postgres` - esse nome só funciona entre containers)
  5. Reinicie o dashboard: pressione `Ctrl+C` e rode `npm run dev` novamente

### Dashboard web não atualiza automaticamente
- **Causa:** JavaScript desabilitado ou problema no navegador
- **Soluções:**
  1. Abra o Console do navegador (F12) e veja se há erros
  2. Tente dar refresh manual (F5)
  3. Limpe o cache do navegador (Ctrl+Shift+Delete)
  4. Teste em modo anônimo/privado
  5. Verifique a aba Network (F12) se as chamadas `/api/ticks` estão retornando 200 OK

### Dashboard mostra "Aguardando dados..." mesmo com dados no banco
- **Causa:** Query retornando vazio ou erro de formatação
- **Soluções:**
  1. Verifique se há dados: `docker exec -it pg psql -U emqx -d iot -c "SELECT COUNT(*) FROM btc_ticks;"`
  2. Teste a API diretamente: abra http://localhost:3000/api/ticks no navegador
  3. Verifique os logs do Next.js no terminal onde rodou `npm run dev`
  4. Certifique-se que o campo `price` não está NULL no banco

### Gráfico não aparece
- **Causa:** Nenhuma cotação do dia atual no banco
- **Soluções:**
  1. Aguarde o ESP32 publicar dados (a cada 60s)
  2. Verifique se há dados de hoje: `SELECT COUNT(*) FROM btc_ticks WHERE ts >= CURRENT_DATE;`
  3. Se precisar testar, insira dados manualmente:
     ```sql
     INSERT INTO btc_ticks (symbol, price, raw, topic, clientid, ts)
     VALUES ('BTCUSDT', 98765.43, '{"test": true}', 'test', 'test', NOW());
     ```

### Resetar tudo e recomeçar

```bash
# Para e remove containers + volumes (APAGA DADOS!)
docker-compose down -v

# Sobe novamente do zero
docker-compose up -d

# Aguarde ~10s para os serviços iniciarem
docker-compose logs -f
```

## 🌐 Dashboard Web

Este projeto inclui um dashboard web moderno para visualização dos dados em tempo real!

### Iniciar o Dashboard

```bash
# Navegar para a pasta web
cd web

# Instalar dependências (apenas na primeira vez)
npm install

# Criar arquivo de configuração
cp .env.local.example .env.local

# Iniciar em modo desenvolvimento
npm run dev
```

Acesse: **http://localhost:3000**

### Funcionalidades do Dashboard

- 📊 **Gráfico interativo** com variação do preço no dia atual
- 📋 **Tabela** com as últimas 10 cotações
- 📈 **Cards de estatísticas**: preço atual, máxima, mínima e variação percentual
- 🔄 **Atualização automática** a cada 10 segundos
- 🎨 **Interface moderna** com TailwindCSS e dark mode
- 📱 **Responsivo** para desktop, tablet e mobile

### Stack do Dashboard

- Next.js 14 (React Framework)
- TypeScript
- TailwindCSS
- Recharts (gráficos)
- PostgreSQL (node-postgres)

Para mais detalhes, veja [web/README.md](web/README.md)

