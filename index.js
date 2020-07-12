'use strict';

require('dotenv').config();
const knex = require('knex');
const knexConfig = require('./knexfile');
const createServer = require('./src');

createServer(knex(knexConfig));
