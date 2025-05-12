const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

const gamesRouter = require('./routes/game');
const playersRouter = require('./routes/player');
const path = require('path');

const app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/api/game', gamesRouter);
app.use('/api/player', playersRouter);

app.use(express.static(path.join(__dirname, 'public')));

app.options('*', cors());

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Error:`, err);

    // error
    if (err instanceof DatabaseError) {
        return res.status(503).json({
            code: 'SERVICE_UNAVAILABLE',
            message: 'Database connection failed'
        });
    }

    if (err.name === 'MongoServerError') {
        const mongoErrors = {
            11000: { status: 409, message: 'Duplicate key error' },
            121: { status: 400, message: 'Document validation failed' }
        };
        const errorConfig = mongoErrors[err.code] || { status: 500, message: 'Database error' };
        return res.status(errorConfig.status).json({
            code: 'MONGO_ERROR',
            details: errorConfig.message
        });
    }

    res.status(err.status || 500).json({
        code: err.code || 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});


module.exports = app;
