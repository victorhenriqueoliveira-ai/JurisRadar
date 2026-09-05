-- comunicacoes_cliente.cliente_id passa a ser nullable
-- Permite registrar comunicações sem exigir cliente previamente cadastrado
ALTER TABLE comunicacoes_cliente ALTER COLUMN cliente_id DROP NOT NULL;
