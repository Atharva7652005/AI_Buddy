const { ChatGroq } = require("@langchain/groq");
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");

const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY, // Defaults to process.env.GROQ_API_KEY
});

/**
 * Generate a new cumulative summary based on previous summary and new interaction
 */
const generateCumulativeSummary = async (previousSummary, prompt, response) => {
  const systemPrompt = `You are an AI assistant designed to maintain a concise, structured, and cumulative summary of a user's conversation with an AI.
Your goal is to blend the 'Previous Summary' with the 'New Prompt' and 'New Response' into a single, cohesive, evolving summary.

Rules:
- Be concise and highly structured (use bullet points or clear sections if needed).
- DO NOT just append the new interaction to the old summary. Integrate the new knowledge into the existing knowledge seamlessly.
- DO NOT repeat information.
- Capture the essence of the user's intent and the AI's conclusions/answers.
- If there is no Previous Summary, just summarize the New Prompt and New Response.`;

  const humanPrompt = `Previous Summary:
${previousSummary || "None"}

New Prompt:
${prompt}

New Response:
${response}

Produce the updated cumulative summary:`;

  const result = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(humanPrompt)
  ]);

  return result.content;
};

/**
 * Generate a short title based on the first prompt
 */
const generateTitle = async (prompt) => {
  const systemPrompt = "You are an AI that generates a very short (max 5 words) title for a conversation based on the user's first prompt. Return ONLY the title text, nothing else.";
  
  const result = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(prompt)
  ]);

  return result.content.replace(/['"]/g, '').trim(); // Remove quotes if any
};

module.exports = {
  generateCumulativeSummary,
  generateTitle
};
