'use strict';

const path = require('path');
require('dotenv').config({
	path: path.resolve(`db${process.env.NODE_ENV === 'production' ? '' : '-dev'}.sqlite3`),
});
const createServer = require('./src');

createServer();
