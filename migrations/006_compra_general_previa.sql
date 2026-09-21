-- Relaciona una compra_general nueva con la compra_general recién finalizada
-- (mismo día, aún no recibida) de la que "continúa" tras un Finalizar Compra
-- accidental. Nullable: no afecta compras existentes.
ALTER TABLE compra_general
  ADD COLUMN IF NOT EXISTS id_compra_general_previa UUID NULL REFERENCES compra_general(id_compra_general);
