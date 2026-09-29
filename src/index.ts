import colors from 'colors';
import server_ws from './server_ws';
import { iniciarXmlWatcher } from './modules/Facturas/services/XmlWatcher.service';
import { iniciarSyncExistenciaPoly } from './modules/Inventario/Stock/services/SyncExistenciaPoly.service';

const port = process.env.PORT || 4000;

server_ws.listen(port, () => {
  console.log(colors.cyan.bold(`REST API en el puerto ${port}`));
  iniciarXmlWatcher();
  iniciarSyncExistenciaPoly();
});

