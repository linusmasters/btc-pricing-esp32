-- Script de inicialização do banco de dados
-- Este script é executado automaticamente quando o container PostgreSQL é criado pela primeira vez

CREATE TABLE IF NOT EXISTS btc_ticks (
  id        BIGSERIAL PRIMARY KEY,
  ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
  symbol    TEXT NOT NULL,
  price     NUMERIC(18,8) NOT NULL,
  raw       JSONB NOT NULL,
  topic     TEXT NOT NULL,
  clientid  TEXT
);

-- Índices úteis para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_btc_ticks_ts ON btc_ticks(ts DESC);
CREATE INDEX IF NOT EXISTS idx_btc_ticks_symbol_ts ON btc_ticks(symbol, ts DESC);

-- Comentários para documentação
COMMENT ON TABLE btc_ticks IS 'Armazena os ticks de preço do Bitcoin recebidos via MQTT';
COMMENT ON COLUMN btc_ticks.ts IS 'Timestamp da cotação';
COMMENT ON COLUMN btc_ticks.symbol IS 'Símbolo do par (ex: BTCUSDT)';
COMMENT ON COLUMN btc_ticks.price IS 'Preço com 8 casas decimais';
COMMENT ON COLUMN btc_ticks.raw IS 'Payload JSON completo recebido';
COMMENT ON COLUMN btc_ticks.topic IS 'Tópico MQTT de origem';
COMMENT ON COLUMN btc_ticks.clientid IS 'ID do cliente MQTT que publicou';
