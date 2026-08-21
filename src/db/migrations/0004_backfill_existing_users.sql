-- Migration de segurança: criar organização padrão para cada usuário existente sem org
-- NUNCA executar em produção sem revisar os dados antes

-- Criar organização padrão para cada user existente sem org
INSERT INTO organizations (id, name, slug, created_at)
SELECT
  gen_random_uuid(),
  COALESCE(name, email, 'Escritório ' || id::text),
  'org-' || id::text,
  now()
FROM users
WHERE id NOT IN (SELECT user_id FROM org_members);

-- Vincular como sócio
INSERT INTO org_members (id, org_id, user_id, role)
SELECT
  gen_random_uuid(),
  o.id,
  u.id,
  'socio'
FROM users u
JOIN organizations o ON o.slug = 'org-' || u.id::text
WHERE u.id NOT IN (SELECT user_id FROM org_members);
