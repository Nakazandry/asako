const groq = require('./groq.service');
const gemini = require('./gemini.service');

class AIProviderError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
  }
}

const generate = async (input = {}) => {
  try {
    const result = await groq.generate(input);
    console.info(
      '[ai] reponse fournisseur',
      JSON.stringify({
        event: 'ai_provider_success',
        provider: 'groq',
        model: result.model,
        conversationId: input.context?.conversationId ?? null,
      })
    );
    return result;
  } catch (error) {
    if (!error?.diagnostic?.retryable) throw error;

    console.warn(
      '[ai] fallback fournisseur',
      JSON.stringify({
        event: 'ai_provider_fallback',
        from: 'groq',
        to: 'gemini',
        reason: error.diagnostic.reason,
        httpStatus: error.diagnostic.httpStatus || null,
        conversationId: input.context?.conversationId ?? null,
      })
    );
  }

  try {
    const result = await gemini.generate(input);
    console.info(
      '[ai] reponse fournisseur',
      JSON.stringify({
        event: 'ai_provider_success',
        provider: 'gemini',
        model: result.model,
        conversationId: input.context?.conversationId ?? null,
      })
    );
    return result;
  } catch (error) {
    console.error(
      '[ai] echec fournisseur',
      JSON.stringify({
        event: 'ai_provider_error',
        provider: 'gemini',
        reason: error?.diagnostic?.reason || error?.code || 'PROVIDER_ERROR',
        httpStatus: error?.diagnostic?.httpStatus || null,
        conversationId: input.context?.conversationId ?? null,
      })
    );
    throw new AIProviderError(
      'UNAVAILABLE',
      "L'assistant IA est temporairement indisponible. Veuillez reessayer dans quelques instants."
    );
  }
};

module.exports = { generate, AIProviderError };
