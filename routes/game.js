const express = require('express');
const router = express.Router();
const db = require('../services/mongodb');



/* vote */
router.post('/vote', async function(req, res) {
    let game = await db.findOne('games', {_id: req.body.gameId});
    if (game) {
        if (game.phrase === 0) res.json({code:200, msg:'game has not started', data: {result: false}});
        let vote = await db.findOne('votes', {address: req.body.address, gameId: req.body.gameId, phrase: game.phrase});
        if (!vote) {
            await db.insert('votes', {address: req.body.address, gameId: req.body.gameId, phrase: game.phrase, playerId: req.body.playerId});
            res.json({code:200, msg:'success', data: {result: true}})
        }
        res.json({code:200, msg:'already voted', data: {result: false}});
    }
    else{
        res.json({code:200, msg:'error', data: {result: false}});
    }
})

router.post('/cancelvote', async function(req, res) {
    let game = await db.findOne('games', {_id: req.body.gameId});
    if (game) {
        if (game.phrase === 0) res.json({code:200, msg:'game has not started', data: {result: false}});
        await db.delete('votes', {address: req.body.address, gameId: req.body.gameId, phrase: game.phrase});
        res.json({code:200, msg:'success', data: {result: true}});
    }else{
        res.json({code:200, msg:'error', data: {result: false}});
    }
})

router.get('/chat', async function(req, res) {
    let game = await db.findOne('games', {_id: Number(req.query.gid)});
    if (game) {
        let phrase = Number(req.query.phrase) === 5 ? 4 : Number(req.query.phrase)
        let chat = await db.find('gameChat', {gameId: Number(req.query.gid), phrase: phrase});
        res.json(chat);
    }else{
        res.json({});
    }
})

router.get('/sysmsg', async function(req, res) {
    let game = await db.findOne('games', {_id: Number(req.query.gid)});
    if (game) {
        let chat = await db.find('sysMsg', {gameId: Number(req.query.gid)});
        res.json(chat);
    }else{
        res.json({});
    }
})

router.get('/vote', async function(req, res) {
    let game = await db.findOne('games', {_id: Number(req.query.gameId)});
    if (game) {
        let vote = await db.findOne('votes', {address: req.query.address, gameId: game._id, phrase: game.phrase});
        res.json(vote);
    }else{
        res.json({});
    }
})

router.get('/list', async function(req, res) {
    let games = await db.find('games', {});
    res.json(games);
})

/* get game info by game id. */
router.get('/:id', async function(req, res) {
    await db.connect();
    let game = await db.findOne('games', {_id: 1});
    res.json(game);
});



module.exports = router;