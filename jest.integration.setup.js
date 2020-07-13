'use strict';

require('dotenv').config();
require('jest-date-mock');
const knex = require('knex');
const knexConfig = require('./knexfile');

global.db = knex(knexConfig);
