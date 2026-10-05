import colors from 'colors';
import server_ws from './server_ws';
import { iniciarXmlWatcher } from './modules/Facturas/services/XmlWatcher.service';
import { iniciarSyncExistenciaPoly } from './modules/Inventario/Stock/services/SyncExistenciaPoly.service';
import { iniciarVigenciaCotizaciones } from './modules/Almacen/Pedido/services/CotizacionesVigencia.service';

const port = process.env.PORT || 4000;

// SIN_TAREAS_AUTOMATICAS=1 levanta solo la API, sin las tareas que escriben solas (sync de existencias a
// PolyDB, cancelación de cotizaciones, vigilante de XML). Para desarrollo en la PC; en el servidor no se pone.
const sinTareas = process.env.SIN_TAREAS_AUTOMATICAS === '1';

server_ws.listen(port, () => {
  console.log(colors.cyan.bold(`REST API en el puerto ${port}`));
  if (sinTareas) {
    console.log(colors.yellow.bold('Tareas automáticas desactivadas (SIN_TAREAS_AUTOMATICAS=1).'));
    return;
  }
  iniciarXmlWatcher();
  iniciarSyncExistenciaPoly();
  iniciarVigenciaCotizaciones();
});

