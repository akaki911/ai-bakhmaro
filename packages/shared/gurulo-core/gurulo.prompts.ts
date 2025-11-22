import {
  SYSTEM_PROMPT_GURULO as runtimeSystemPromptGurulo,
  DEVELOPER_PROMPT as runtimeDeveloperPrompt,
  PROMPT_TEMPLATES as runtimePromptTemplates,
  getPromptTemplate as runtimeGetPromptTemplate,
} from './gurulo.prompts.js';

export type PromptTemplateKey =
  | 'system_prompt.gurulo'
  | 'system_prompt_gurulo'
  | 'systemPromptGurulo'
  | 'developer_prompt'
  | 'developer.prompt'
  | 'developerPrompt';

export const SYSTEM_PROMPT_GURULO: string = runtimeSystemPromptGurulo;
export const DEVELOPER_PROMPT: string = runtimeDeveloperPrompt;
export const PROMPT_TEMPLATES: Readonly<Record<string, string>> =
  runtimePromptTemplates as Readonly<Record<string, string>>;

export const getPromptTemplate: (key: PromptTemplateKey | string) => string | null =
  runtimeGetPromptTemplate as (key: PromptTemplateKey | string) => string | null;
