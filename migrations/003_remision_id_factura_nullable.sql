-- Permite crear remisiones sin factura CFDI (pedidos generales sin timbrado)
ALTER TABLE remision ALTER COLUMN id_factura DROP NOT NULL;
