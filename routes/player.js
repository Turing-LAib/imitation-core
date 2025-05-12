const express = require('express');
const router = express.Router();
const db = require('../services/mongodb');

/* get player info by player id. */
router.get('/list', async function(req, res) {
    await db.connect();
    let players = await db.find('player', {gameId: Number(req.query.gid)});
    res.json(players);
});



module.exports = router;