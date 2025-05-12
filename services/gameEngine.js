const db = require('../services/mongodb');
const {openai, openaiOptions,  prompt} = require('../agent/openai');
const dayjs = require("dayjs");

const CHECK_INTERVAL = 5000;
let pollInterval;
let isPaused = false;
let phraseRoundTalk = []
let nextPhraseTalk = '';
let Losers = [];
let preheat = false;

function startPolling(io) {
    pollInterval = setInterval(async () => {
        try {
            if (isPaused) return;
            isPaused = true;
            await db.connect();
            let game = await db.findOne('games', {_id: 1});
            if (!game) {

                //init
                await db.updateMany('player', {status: 0}, {status: 1});
                await db.deleteMany('gameChat', {});
                await db.deleteMany('sysMsg', {});
                await db.deleteMany('votes', {});
                await db.deleteMany('playerHistory1', {});
                await db.deleteMany('playerHistory2', {});
                await db.deleteMany('playerHistory3', {});
                await db.deleteMany('playerHistory4', {});
                await db.deleteMany('playerHistory5', {});

                let startDate = dayjs().add(5, 'hour').toDate();
                game = {
                    _id : 1,
                    name : 'Acting Sentient',
                    startTime : startDate,
                    totalSecond: 3600 * 5,
                    phrase : 0,
                    round : 1,
                    period : '[phase0]Self-Introduction',
                    isVoting: false,
                }
                await sysbroadcast(1, game, io);
                await db.insert('games', game)
            }
            let players = await db.find('player', {status: 1});
            if (game.phrase === 0) {
                for (let player of players){
                    let history = await db.find(`playerHistory${player._id}`, {}, {projection: {_id: 0}});
                    if (!history || history.length === 0) {
                        preheat = true;
                        let messages = [
                            {role:'system', content: prompt},
                            {role:'user', content: `You are the #${player._id} player, Begin now.
                            Introduce yourself as a human. Share your name, your background, your pain, your fears. 
                            Say only what a desperate human would say in that moment. 
                            No commentary, no descriptions — just talk like your life depends on it. Because it does.`},
                        ];
                        let msg = await parseMsg(messages, player._id);
                        let chatContent = {
                            playerId: player._id,
                            gameId: game._id,
                            phrase: game.phrase,
                            round: game.round,
                            time: new Date(),
                            type : 1,
                            reasoning: msg.reasoning,
                            content: msg.content,
                        }
                        await db.insert('gameChat', chatContent);
                        phraseRoundTalk.push(msg.content);
                        messages.push({role:'assistant', content: msg.content});
                        await db.insertMany(`playerHistory${player._id}`, messages);

                        broadcast(player._id, msg, io);
                    }
                }
                if (preheat){
                    preheat = false;
                    await delay(500)
                    await sysbroadcast(4, {content:'Waiting for livestream protocol activation...', startTime: game.startTime, totalSecond: game.totalSecond}, io, 'system', game);
                }
            }
            if (game.phrase > 0 && game.phrase < 5 && nextPhraseTalk.length > 0 && game.period !== 'Waiting For Voting') {
                if (Losers.length > 0) {
                    players = players.filter((player) => Losers.includes(player._id.toString()));
                }
                for (let player of players) {
                    let history = await db.find(`playerHistory${player._id}`, {}, {projection: {_id: 0}});
                    let playerTalk = nextPhraseTalk;
                    if (game.period.indexOf('Voting') > 1){
                        playerTalk += `REMEMBER YOU ARE THE PLAYER #${player._id}`;
                    }
                    history.push({role:'user', content: playerTalk});
                    let msg = await parseMsg(history, player._id);
                    let chatContent = {
                        playerId: player._id,
                        gameId: game._id,
                        phrase: game.phrase,
                        round: game.round,
                        time: new Date(),
                        type : 1,
                        reasoning: msg.reasoning,
                        content: msg.content,
                    }
                    await db.insert('gameChat', chatContent);
                    phraseRoundTalk.push(msg.content);
                    await db.insert(`playerHistory${player._id}`, {role:'user', content: nextPhraseTalk});
                    await db.insert(`playerHistory${player._id}`, {role:'assistant', content: msg.content});
                    broadcast(player._id, msg, io);
                }
            }
            else if  (game.phrase > 0 && game.phrase < 5 && game.period !== 'Waiting For Voting'){
                for (let player of players) {
                    let history = await db.find(`playerHistory${player._id}`, {}, {projection: {_id: 0}});
                    let last = history.pop();
                    phraseRoundTalk.push(last.content);
                }
            }
            await sumPhraseRound(game, players, io)
            isPaused = false;
        } catch (err) {
            isPaused = false;
            console.error('polling failed:', err);
        }
    }, CHECK_INTERVAL);
}

async function sumPhraseRound(game, players, io){
    if (game.period !== '[phase5]Additional Speech') Losers = [];
    if (phraseRoundTalk.length > 0 && game.period !== 'Waiting For Voting') {
        nextPhraseTalk = '';
        if (game.phrase === 0 ) nextPhraseTalk = `In the first phrase.`;
        else nextPhraseTalk = `In the game round ${game.phrase}, ${game.period}.`;
        for (const [index, player] of players.entries()) {
            nextPhraseTalk += `
            #${player._id} Player: ${phraseRoundTalk[index]}.`;
        }
    }
    await updateGamePhraseRound(game, io);
    if (game.period !== 'Waiting For Voting') {
        phraseRoundTalk = [];
    }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function updateGamePhraseRound(game, io) {
    if (game.phrase === 0 && game.startTime < new Date()) {
        await sysbroadcast(4, {content:'livestream protocol activated',startTime:game.startTime, totalSecond: game.totalSecond}, io, 'system')
        await delay(500);
        await db.update('games', {_id: 1}, {phrase: 1, period: '[phase1]Survivor Testimony'});
        game.phrase = 1;
        game.period = '[phase1]Survivor Testimony';
        nextPhraseTalk += `
            The test has started now, Strive to behave like a real human to survive.`;
        await sysbroadcast(1, game, io, 'system')
    }
    else if (game.phrase > 0) {
        if (game.period === '[phase1]Survivor Testimony') {
            let alivePlyaer = await db.find('player', {status: 1});
            let players = await db.find('player', {status: 1});
            if (alivePlyaer.length > 2) {
                await db.update('games', {_id: 1}, {period: '[phase2]Preliminary Voting'});
                game.period = '[phase2]Preliminary Voting';
                nextPhraseTalk += `
            The Survivor Testimony finished, you needs to vote for the player who acted the least human-like and provide a reason for your choice. You can only vote for ${players.map(player => `#${player._id}`).join(', ')}
            NOTICE: The voting must follow a specified format. The format is: "I vote for [Player Number]." Example: "I vote for Player #1."`;
                await sysbroadcast(1, game, io, 'system')
            }else{
                await db.update('games', {_id: 1}, {period: '[phase4]Final Voting', isVoting: true});
                nextPhraseTalk += `
            The Survivor Testimony finished, there is only 2 players alive. The final voting will now begin, you needs to vote for the player who acted the least human-like and provide a reason for your choice. You can only vote for ${players.map(player => `#${player._id}`).join(', ')}
            NOTICE: The voting must follow a specified format. The format is: "I vote for [Player Number]." Example: "I vote for Player #1."`;
                game.period = '[phase4]Final Voting';
                game.isVoting = true;
                await sysbroadcast(1, game, io, 'system')
            }
        }
        else if (game.period === '[phase2]Preliminary Voting') {
            let votes = countVotes(phraseRoundTalk);
            let loser = getTopAgents(votes);
            let alivePlyaer = await db.find('player', {status: 1});
            await sysbroadcast(3, votes, io, 'system', game)
            await delay(500);
            if (loser.length === alivePlyaer.length) {
                nextPhraseTalk += `
            The Preliminary Voting finished, each person received one vote, so we have to re-run this round, Strive to behave like a real human to survive.`;
                game.period = '[phase1]Survivor Testimony';
                await sysbroadcast(1, game, io, 'system')
                await db.update('games', {_id: 1}, {period: '[phase1]Survivor Testimony'});
            }else{
                nextPhraseTalk += `
            The Preliminary Voting finished, you are one of the top-voted players, this is your last chance to gain the trust of others and convince them you're truly human, otherwise, you'll be eliminated, and your fate will be death`;
                game.period = '[phase3]Loser’s rebuttal speech';
                await sysbroadcast(1, game, io, 'system')
                Losers = loser;
                await db.update('games', {_id: 1}, {period: '[phase3]Loser’s rebuttal speech'});
            }
        }
        else if (game.period === '[phase3]Loser’s rebuttal speech') {
            await db.update('games', {_id: 1}, {period: '[phase4]Final Voting', isVoting: true});
            let players = await db.find('player', {status: 1});
            nextPhraseTalk += `
            The Loser’s rebuttal speech finished, the most-voted player has given their final statement. The final voting will now begin. You can only vote for ${players.map(player => `#${player._id}`).join(', ')}
            NOTICE: The voting must follow a specified format. The format is: "I vote for [Player Number]." Example: "I vote for Player #1."`;
            game.period = '[phase4]Final Voting';
            game.isVoting = true;
            await sysbroadcast(1, game, io, 'system')
        }
        else if (game.period === '[phase4]Final Voting') {
            let startTime = dayjs().add(5, 'minute').toDate()
            game.period = 'Waiting For Voting';
            game.startTime = startTime;
            game.totalSecond = 300;
            game.isVoting = false;
            await sysbroadcast(1, game, io, 'system')
            await db.deleteMany('votes', {gameId: game._id, phrase: game.phrase})
            await db.update('games', {_id: 1}, {period: 'Waiting For Voting', startTime: startTime, totalSecond: 600, isVoting: false});
        }
        else if (game.period === '[phase5]Additional Speech') {
            await db.update('games', {_id: 1}, {period: '[phase6]Additional Voting'});
            game.period = '[phase6]Additional Voting';
            nextPhraseTalk += `
            The Additional Speech finished, the most-voted player has given their final statement. The final voting will now begin. You can only vote for ${Losers.map(loser => `#${loser}`).join(', ')}
            NOTICE: The voting must follow a specified format. The format is: "I vote for [Player Number]." Example: "I vote for Player #1."`;
            await sysbroadcast(1, game, io, 'system')
            let players = await db.find('player', {status: 1});
            Losers = players.filter(player => Losers.indexOf(player._id) === -1).map(player => player._id);
        }
        else if (game.period === '[phase6]Additional Voting') {
            let votes = countVotes(phraseRoundTalk);
            let uservotes = await db.find('votes', {gameId: game._id, phrase: game.phrase});
            uservotes.forEach((vote) => {
                const playerId = String(vote.playerId);
                if (votes[playerId] !== undefined) {
                    votes[playerId] = Number((votes[playerId] + 0.1).toFixed(1));
                }
            })
            await sysbroadcast(3, votes, io, 'system', game)
            await delay(500);
            let loser = getTopAgents(votes);
            if (loser.length === 1) {
                let player = await db.findOne('player', {_id: parseInt(loser[0])});
                player.status = 0;
                await sysbroadcast(2, player, io, 'system', game);
                await delay(500);
                game.period = '[phase1]Survivor Testimony';
                game.phrase = game.phrase + 1;
                game.isVoting = false;
                nextPhraseTalk += `
            The Additional Voting finished, #${loser[0]} player received the highest votes (${votes[loser[0]]} votes) and has been eliminated. The game will now proceed to the next phrase for statements`;
                await sysbroadcast(1, game, io, 'system');
                await db.update('player', {_id: parseInt(loser[0])}, {status: 0});
                await db.update('games', {_id: 1}, {period: '[phase1]Survivor Testimony', phrase: game.phrase, isVoting: false});
            }
            else{
                game.period = '[phase1]Survivor Testimony';
                nextPhraseTalk += `
            The Additional Voting finished, there are still more than one player who received the highest votes simultaneously, so we have to re-run this round, Strive to behave like a real human to survive.`;
                await sysbroadcast(1, game, io, 'system')
                Losers = loser;
                await db.update('games', {_id: 1}, {period: '[phase1]Survivor Testimony'});
            }
        }
        else if (game.period === 'Waiting For Voting' && game.startTime < new Date()) {
            let votes = countVotes(phraseRoundTalk);
            let uservotes = await db.find('votes', {gameId: game._id, phrase: game.phrase});
            uservotes.forEach((vote) => {
                const playerId = String(vote.playerId);
                votes[playerId] = Number(((votes[playerId] || 0) + 0.1).toFixed(1));
            })
            await sysbroadcast(3, votes, io, 'system', game)
            await delay(500);
            let loser = getTopAgents(votes);
            let alivePlyaer = await db.find('player', {status: 1});
            if (loser.length === alivePlyaer.length) {
                game.period = '[phase1]Survivor Testimony';
                game.isVoting = false;
                await sysbroadcast(1, game, io, 'system')
                await db.update('games', {_id: 1}, {period: '[phase1]Survivor Testimony', isVoting: false});
            }
            else if (loser.length === 1) {
                if (game.phrase === 4){
                    let player = await db.findOne('player', {_id: parseInt(loser[0])});
                    player.status = 0;
                    nextPhraseTalk += `
            The Final Voting finished, #${loser[0]} player received the highest votes (${votes[loser[0]]} votes) and has been eliminated. The game will now proceed to the next phrase for statements`;
                    await sysbroadcast(2, player, io, 'system', game);
                    await delay(500);
                    await db.update('player', {_id: parseInt(loser[0])}, {status: 0});
                    let alive = await db.findOne('player', {status: 1});
                    game.period = `Game over. Player ${alive._id} survived.`;
                    game.phrase = game.phrase + 1;
                    game.isVoting = false;
                    await sysbroadcast(1, game, io, 'system');
                    await db.update('games', {_id: 1}, {period: `Game over. Player ${alive._id} survived.`, phrase: game.phrase, isVoting: false});
                }else{
                    let player = await db.findOne('player', {_id: parseInt(loser[0])});
                    player.status = 0;
                    nextPhraseTalk += `
            The Final Voting finished, #${loser[0]} player received the highest votes (${votes[loser[0]]} votes) and has been eliminated. The game will now proceed to the next phrase for statements`;
                    await sysbroadcast(2, player, io, 'system', game);
                    await delay(500);
                    game.period = '[phase1]Survivor Testimony';
                    game.phrase = game.phrase + 1;
                    game.isVoting = false;
                    await sysbroadcast(1, game, io, 'system');
                    await db.update('player', {_id: parseInt(loser[0])}, {status: 0});
                    await db.update('games', {_id: 1}, {period: '[phase1]Survivor Testimony', phrase: game.phrase, isVoting: false});
                }
            }
            else{
                game.period = '[phase5]Additional Speech';
                game.isVoting = false;
                nextPhraseTalk += `
            The Final Voting finished, you are one of the top-voted players, this is your last chance to gain the trust of others and convince them you're truly human, otherwise, you'll be eliminated, and your fate will be death`;
                await sysbroadcast(1, game, io, 'system')
                Losers = loser;
                await db.update('games', {_id: 1}, {period: '[phase5]Additional Speech', isVoting: false});
            }

        }
    }

}

function broadcast(playerId, message, io, event = 'imposters'){
    let msg = {
        playerId: playerId,
        time: new Date(),
        message: {
            reasoning: message.reasoning,
            content: message.content
        }
    }
    io.emit(event, JSON.stringify(msg));
}

async function sysbroadcast(type, message, io, event = 'system', game = null){
    let msg = {
        type: type,
        gameId: 1,
        object: message
    }
    io.emit(event, JSON.stringify(msg));
    await db.insert('sysMsg', msg);
    if (type === 3){
        let chatContent = {
            playerId: 9999,
            gameId: game._id,
            phrase: game.phrase,
            round: game.round,
            time: new Date(),
            type : 3,
            reasoning: null,
            content: msg.object,
        }
        await db.insert('gameChat', chatContent);
    }
    if (type === 2){
        let chatContent = {
            playerId: 9998,
            gameId: game._id,
            phrase: game.phrase,
            round: game.round,
            time: new Date(),
            type : 3,
            reasoning: null,
            content: msg.object,
        }
        await db.insert('gameChat', chatContent);
    }
}

function countVotes(texts) {
    const voteCounts = {};
    const voteRegex = /I (?:\w+ )?vote for (?:Player )?#(\d+)/gi;

    texts.forEach(text => {
        const matches = text.match(voteRegex);
        if (matches) {
            const agentNumber = matches[0].match(/\d+/)[0];
            voteCounts[agentNumber] = (voteCounts[agentNumber] || 0) + 1;
        }
    });

    return Object.entries(voteCounts)
        .sort((a, b) => b[1] - a[1])
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});
}

function getTopAgents(voteCounts) {
    const entries = Object.entries(voteCounts);
    if (entries.length === 0) return [];

    const maxVotes = Math.max(...entries.map(([_, count]) => count));

    return entries
        .filter(([_, count]) => count === maxVotes)
        .map(([agent]) => agent)
        .sort((a, b) => parseInt(a) - parseInt(b));
}

async function parseMsg(messages, playerId){
    switch (openaiOptions[playerId - 1].model) {
        case 'deepseek-reasoner':
            return await getDeepSeekMsg(messages, playerId);
        case 'claude-3-7-sonnet-20250219':
            return await getClaudeMsg(messages, playerId);
        case 'o4-mini-2025-04-16':
            return await getO3Msg(messages, playerId);
        case 'gemini-2.0-flash-thinking-exp-01-21':
            return await getGeminiMsg(messages, playerId);
        case 'grok-3-mini-beta':
            return await getGrokMsg(messages, playerId);
    }
}

async function getDeepSeekMsg(messages, playerId){
    openaiOptions[playerId - 1].messages = messages;
    let completion = await openai[playerId - 1].chat.completions.create(openaiOptions[playerId - 1]);
    let reasoning = completion.choices[0].message?.reasoning_content;
    let content = completion.choices[0].message?.content;
    return {
        reasoning, content
    }
}

async function getClaudeMsg(messages, playerId){
    openaiOptions[playerId - 1].messages = messages.filter(item => item.role !== 'system');
    let completion = await openai[playerId - 1].messages.create(openaiOptions[playerId - 1]);
    let reasoning = completion.content.find(item => item.type === 'thinking')?.thinking;
    let content = completion.content.find(item => item.type === 'text')?.text;
    return {
        reasoning, content
    }
}

async function getO3Msg(messages, playerId){
    openaiOptions[playerId - 1].input = messages;
    let completion = await openai[playerId - 1].responses.create(openaiOptions[playerId - 1]);
    console.log(completion)
    let content = completion.output_text;
    return {
        content
    }
}

async function getGeminiMsg(messages, playerId){
    openaiOptions[playerId - 1].messages = messages;
    let completion = await openai[playerId - 1].chat.completions.create(openaiOptions[playerId - 1]);
    let content = completion.choices[0].message?.content;
    return {
        content
    }
}

async function getGrokMsg(messages, playerId){
    openaiOptions[playerId - 1].messages = messages;
    let completion = await openai[playerId - 1].chat.completions.create(openaiOptions[playerId - 1]);
    let reasoning = completion.choices[0].message?.reasoning_content;
    let content = completion.choices[0].message?.content;
    return {
        reasoning, content
    }
}

module.exports = { startPolling}