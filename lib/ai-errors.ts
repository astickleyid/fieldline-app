/**
 * Translates raw Anthropic SDK errors into user-friendly messages.
 */
export function friendlyAIError(err: any): { message: string; raw: string; status: number } {
  const raw = String(err?.message || err || 'Unknown AI error');

  if (raw.includes('credit balance is too low') || raw.includes('credit_balance')) {
    return {
      message: 'AI is temporarily unavailable (account billing). Please contact support.',
      raw, status: 502,
    };
  }
  if (raw.includes('rate_limit') || raw.includes('429')) {
    return {
      message: 'AI is busy right now. Please try again in a few seconds.',
      raw, status: 429,
    };
  }
  if (raw.includes('overloaded') || raw.includes('529')) {
    return {
      message: 'AI service is overloaded. Please try again shortly.',
      raw, status: 503,
    };
  }
  if (raw.includes('invalid_api_key') || raw.includes('401')) {
    return {
      message: 'AI service authentication failed. Please contact support.',
      raw, status: 502,
    };
  }
  if (raw.includes('timeout') || raw.includes('ETIMEDOUT')) {
    return {
      message: 'AI request timed out. Please try again.',
      raw, status: 504,
    };
  }
  return {
    message: 'AI generation failed. Please try again — if it keeps happening, contact support.',
    raw, status: 502,
  };
}
