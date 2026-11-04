// The model AI analysis runs on, and its list price, in one place: the request, the
// note under the API key field and the cost shown after an analysis all read from here.
// Prices are Anthropic's API list prices (USD per million tokens) as of November 2026.
export const MODEL_ID = "claude-opus-5-5";
export const MODEL_NAME = "Claude Opus 5.5";
export const PRICE_PER_MTOK = { input: 4, output: 20 };

export const estimateCost = (inputTokens, outputTokens) =>
  (inputTokens * PRICE_PER_MTOK.input + outputTokens * PRICE_PER_MTOK.output) / 1_000_000;
