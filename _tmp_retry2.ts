import { dbLocal } from './src/config/db';
(async () => {
  try {
    await dbLocal.authenticate();
    console.log('OK conectado');
  } catch (e: any) {
    console.log('FALLO:', e.message);
  }
  process.exit(0);
})();
