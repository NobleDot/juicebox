require('dotenv').config();

console.log(process.env.JWT_SECRET);

const secret = process.env.JWT_SECRET;

const express = require('express');

const morgan = require('morgan');

const jwt = require("jsonwebtoken");

const { client } = require('./db');

const server = express();

server.use(morgan('dev'));

server.use(express.json())

const apiRouter = require('./api');
server.use('/api', apiRouter);

server.use((req, res, next) => {

    console.log("<____Body Logger START____>");
    console.log(req.body);
    console.log("<_____Body Logger END_____>");

    next();
});

client.connect(); 

server.listen(3000, () => {console.log('The server is up on port', 3000)});