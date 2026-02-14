import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AppSettings } from '../../../../shared/types';

const MODEL_DEFAULTS = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
} as const;

export function getModel(settings: AppSettings): BaseChatModel {
  if (settings.aiProvider === 'anthropic') {
    return new ChatAnthropic({
      modelName: settings.model || MODEL_DEFAULTS.anthropic,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      temperature: 0.3,
    });
  }

  return new ChatOpenAI({
    modelName: settings.model || MODEL_DEFAULTS.openai,
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.3,
  });
}
