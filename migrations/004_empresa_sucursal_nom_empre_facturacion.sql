-- Nombre del emisor que aparece en los archivos .txt para el software de facturación.
-- Si es NULL se usa nom_empre. Útil para recortar el sufijo legal (ej: "S DE RL DE CV").
ALTER TABLE empresa_sucursal
    ADD COLUMN IF NOT EXISTS nom_empre_facturacion VARCHAR(100) NULL;
