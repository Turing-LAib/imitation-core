const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const gamesRouter = require('./routes/game');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/api/game', gamesRouter);

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});


module.exports = app;
