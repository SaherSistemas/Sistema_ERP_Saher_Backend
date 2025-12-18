import colors from 'colors';
import server_ws from './server_ws';

const port = process.env.PORT || 4000;

server_ws.listen(port, () => {
  console.log(colors.cyan.bold(`REST API en el puerto ${port}`));
});
