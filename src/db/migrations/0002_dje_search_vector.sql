-- Verifica que o dicionário 'portuguese' está disponível no banco
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_ts_config WHERE cfgname = 'portuguese'
  ) THEN
    RAISE EXCEPTION 'Dicionário full-text "portuguese" não disponível no banco. Não é possível criar a coluna search_vector.';
  END IF;
END $$;

-- Coluna gerada (GENERATED ALWAYS AS) para full-text search em português
ALTER TABLE dje_publications
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED;

-- Índice GIN para buscas full-text eficientes
CREATE INDEX dje_pub_search_vector_idx
  ON dje_publications USING GIN(search_vector);
