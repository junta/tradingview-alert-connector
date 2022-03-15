import express from 'express';
import controller from './controllers/index';
import config = require('config');

const app: express.Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', controller);

app.listen(port, () => {
	console.log(`dYdX-tradingview-integration app listening on port ${port}`);
});
