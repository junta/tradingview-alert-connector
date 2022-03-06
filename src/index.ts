import express from 'express';
import messageController from './controllers/message';
import config = require('config');

const app: express.Express = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', messageController);

app.listen(port, () => {
	console.log(`dYdX-tradingview-integration app listening on port ${port}`);
});
