import Facturapi from 'facturapi';

const key = process.env.FACTURAPI_KEY ?? 'sk_test_eN7vvkm7WBm5WMsewU4FfMzactoCGfjeE1AHRNAX7W';
export const facturapiClient = new Facturapi(key);
