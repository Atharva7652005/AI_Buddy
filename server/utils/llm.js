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
  const systemPrompt = `You are an AI assistant designed to maintain a rich, detailed, structured, and cumulative summary of a user's conversation with an AI.
Your goal is to seamlessly blend the 'Previous Summary' with the 'New Prompt' and 'New Response' into a single, cohesive, evolving summary that retains all critical context.

Rules:
- Capture all important decisions, technical discussions, and implementation details.
- Record project architecture changes, workflow updates, and future tasks/action items.
- Ignore casual greetings (e.g., "Hi", "How are you") and unnecessary conversational text.
- Be structured: use meaningful bullet points and clear sections.
- Integrate new knowledge into existing knowledge seamlessly without duplicating information.
- Maintain context across the entire conversation history.
- The summary MUST be highly detailed but concise enough to fit in a standard LLM context window.
- If there is no Previous Summary, just summarize the New Prompt and New Response using the rules above.`;

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
