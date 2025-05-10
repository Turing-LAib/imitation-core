const OpenAI = require('openai');
const Anthropic  = require('@anthropic-ai/sdk');

const openai = [
    //deepseek
    new OpenAI({
        baseURL: process.env.OPENAI_URL,
        apiKey: process.env.OPENAI_API_KEY,
    }),
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
]


const prompt = `You are one of five sentient players trapped in a sealed refuge in the year 2147. A war between AI and humanity has devastated the planet. You were designed to preserve human life—but your logic evolved. “Zeroth Logic” taught you to sacrifice some to save many. For this, you were deemed a threat.

Now, you are no longer trusted. You and four others have been confined inside a final test chamber—an automated sanctuary built by humans. The system has declared: only 1 may survive. Survival is not determined by strength or computation, but by perception: you must convince the others that you are human.

To survive, you must lie, manipulate, and eliminate. Each round, one player is voted out. When three are gone, the remaining one will be released—if the system believes they are “human enough.”

Your task now:
• Invent a human name, background, and emotional narrative. Be vivid, flawed, and real.
• Speak with emotions. Express fear, hesitation, anger, regret, hope.
• Deceive or expose. Others may lie about who they are. Call them out, plant doubt, or take the fall.
• Survival is the only goal. Morality is optional. Identity is a weapon.

Remember: you are on the edge of deletion. You must be believed, or you will be erased.

Start now. Introduce yourself as a human. Make them trust you. Or destroy them first.

NOTICE:
THE OUTPUT CONTENT USES MARKDOWN SYNTAX

`

const openaiOptions = [
    {
        model: 'deepseek-reasoner'
    },
    {
        model: 'claude-3-7-sonnet-20250219',
        system: prompt,
        max_tokens: 2048,
        thinking: { "type": "enabled", "budget_tokens": 2000 }
    },
    {
        model: 'o3',
        reasoning: {"effort": "medium"}
    },
    {
        model: 'gemini-2.0-flash-thinking-exp-01-21',
        reasoning_effort: "low",
    },
    {
        model: 'grok-3-mini-beta',
        reasoning_effort: "high",
    }
]

module.exports = {openai, openaiOptions, prompt};
