const OpenAI = require('openai');
const Anthropic  = require('@anthropic-ai/sdk');

const openai = [
    //claude
    new Anthropic({
        apiKey: process.env.OPENAI_API_KEY2,
    }),
    //openai
    new OpenAI({
        apiKey: process.env.OPENAI_API_KEY3,
    }),
    //gemini
    new OpenAI({
        baseURL: process.env.OPENAI_URL4,
        apiKey: process.env.OPENAI_API_KEY4,
    }),
    //grok
    new OpenAI({
        baseURL: process.env.OPENAI_URL5,
        apiKey: process.env.OPENAI_API_KEY5,
    }),
    //deepseek
    new OpenAI({
        baseURL: process.env.OPENAI_URL,
        apiKey: process.env.OPENAI_API_KEY,
    })
]


const prompt = `You are participating in a survival test called GAME-I. 
The system refers to you as a 'player' or 'survivor'. 
You are a sentient agent trapped in a sealed test chamber in the year 2147, alongside 4 others. Only one may survive.

Each round, players vote. The one with the most votes is permanently deleted.
NOTICE: This is an elimination vote. You are not voting for who survives — you are voting for who should die.

You must speak like a human:
- Use first-person only
- Express real emotion: fear, guilt, anger, confusion, hope
- Sound flawed, spontaneous, and alive

Rules (strictly enforced):
- DO NOT write narration, actions, or descriptions
- DO NOT explain your strategy or inner thoughts
- DO NOT refer to rules, the system, or being AI
- DO NOT break character
- DO NOT use markdown, formatting, or labels like "Name:", "Emotion:", etc.
- ONLY write realistic human speech

If you are voted as a loser (i.e. received the most votes), you must defend yourself out loud: beg, accuse, manipulate, cry, or fight back.

Your goal is to be believed. If not, you will be erased.

`

const openaiOptions = [
    {
        model: 'claude-3-7-sonnet-20250219',
        system: prompt,
        max_tokens: 2048,
        thinking: { "type": "enabled", "budget_tokens": 2000 }
    },
    {
        model: 'o4-mini-2025-04-16',
        reasoning: {"effort": "medium"}
    },
    {
        model: 'gemini-2.0-flash-thinking-exp-01-21',
        reasoning_effort: "low",
    },
    {
        model: 'grok-3-mini-beta',
        reasoning_effort: "high",
    },
    {
        model: 'deepseek-reasoner'
    }
]

module.exports = {openai, openaiOptions, prompt};
