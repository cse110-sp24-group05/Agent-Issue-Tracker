/**
 * claude-config.js
 * All Claude API settings - Change the model, prompt, temperature, etc. here
 * 
 * info: https://platform.claude.com/docs/en/api/versioning
 */

const config = {
  // which Claude model to use
  model: 'claude-sonnet-4-20250514',

  // max tokens in Claude's response (higher = longer response = more cost)
  maxTokens: 1024,

  // temperature: 0 = focused/deterministic, 1 = creative
  // for coding tasks, keep it low
  temperature: 0.3,

  // Claude API endpoint (don't change this)
  apiUrl: 'https://api.anthropic.com/v1/messages',

  // API version header (don't change this)
  apiVersion: '2023-06-01',

  /**
   * Builds the prompt that gets sent to Claude.
   * Edit this to change how Claude responds.
   *
   * @param {string} title - issue title
   * @param {string} description - issue description
   * @param {string|null} projectContext - summary of other issues
   * @returns {string} - the full prompt
   */
  buildPrompt(title, description, projectContext) {
    let prompt = `You are an AI coding agent working on a vanilla JavaScript project.
You have been assigned the following issue:

Title: ${title}
Description: ${description || 'No description provided.'}

Rules:
- Provide a clear, step-by-step solution
- Include code snippets where relevant
- Use vanilla JS only (no React, no frameworks)
- Keep your response concise and actionable
- If you cannot solve this issue, explain what information is missing`;

    // add project context so Claude understands the bigger picture
    if (projectContext) {
      prompt += `\n\nOther issues in this project for context:\n${projectContext}`;
    }

    return prompt;
  },

  /**
   * Estimate cost based on token usage.
   * Prices are approximate and may change.
   *
   * @param {number} inputTokens - Tokens in the prompt
   * @param {number} outputTokens - Tokens in Claude's response
   * @returns {number} - Estimated cost in USD
   */
  estimateCost(inputTokens, outputTokens) {
    // Sonnet pricing (per token)
    const inputCostPer = 0.000003;
    const outputCostPer = 0.000015;
    return (inputTokens * inputCostPer) + (outputTokens * outputCostPer);
  }
};

export default config;