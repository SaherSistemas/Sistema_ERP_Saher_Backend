// src/middlewares/uploadNotaCredito.ts
import multer from "multer";

const storage = multer.memoryStorage();

export const uploadNotaCredito = multer({
    storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20 MB por archivo (ajusta a tu gusto)
    },
}).fields([
    { name: "pdf", maxCount: 1 },
    { name: "xml", maxCount: 1 },
]);
