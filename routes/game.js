const express = require('express');
const router = express.Router();

/* get game info by game id. */
router.get('/:id', function(req, res) {
    res.json({code:200, msg:'Hello World'});
});


/* create a new game */
router.post('/create', function(req, res) {
    res.json({code:200, msg:'Hello World', data: {result: true}});
})

module.exports = router;