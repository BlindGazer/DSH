import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Built-in provider endpoints from @deepseek-ai/dsh-llm-pi-ai and DSH core.
 */
export const BUILTIN_PROVIDER_ENDPOINTS = Object.freeze({
  'deepseek-account': {
    name: 'DeepSeek Account',
    settingsNs: 'llm-deepseek-account',
    urls: ['https://api.deepseek.com']
  },
  'deepseek-official': {
    name: 'DeepSeek',
    settingsNs: 'llm-deepseek',
    urls: ['https://api.deepseek.com']
  },
  deepseek: {
    name: 'DeepSeek',
    settingsNs: 'llm-deepseek',
    urls: ['https://api.deepseek.com']
  },
  google: {
    name: 'google',
    settingsNs: 'llm-pi-ai',
    urls: ['https://generativelanguage.googleapis.com/v1beta']
  },
  openai: {
    name: 'OpenAI',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.openai.com/v1']
  },
  'openai-codex': {
    name: 'OpenAI Codex',
    settingsNs: 'llm-pi-ai',
    urls: ['https://chatgpt.com/backend-api', 'https://auth.openai.com']
  },
  anthropic: {
    name: 'Anthropic',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.anthropic.com']
  },
  openrouter: {
    name: 'OpenRouter',
    settingsNs: 'llm-pi-ai',
    urls: ['https://openrouter.ai/api/v1']
  },
  groq: {
    name: 'Groq',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.groq.com/openai/v1']
  },
  mistral: {
    name: 'Mistral',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.mistral.ai']
  },
  xai: {
    name: 'xAI',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.x.ai/v1']
  },
  cerebras: {
    name: 'Cerebras',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.cerebras.ai/v1']
  },
  fireworks: {
    name: 'Fireworks',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.fireworks.ai/inference']
  },
  'github-copilot': {
    name: 'GitHub Copilot',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.individual.githubcopilot.com']
  },
  huggingface: {
    name: 'HuggingFace',
    settingsNs: 'llm-pi-ai',
    urls: ['https://router.huggingface.co/v1']
  },
  'kimi-coding': {
    name: 'Kimi Coding',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.kimi.com/coding']
  },
  meta: {
    name: 'Meta',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.meta.ai/v1']
  },
  minimax: {
    name: 'MiniMax',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.minimax.io/anthropic']
  },
  'minimax-cn': {
    name: 'MiniMax CN',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.minimaxi.com/anthropic']
  },
  moonshotai: {
    name: 'Moonshot AI',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.moonshot.ai/v1']
  },
  'moonshotai-cn': {
    name: 'Moonshot AI CN',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.moonshot.cn/v1']
  },
  nvidia: {
    name: 'NVIDIA',
    settingsNs: 'llm-pi-ai',
    urls: ['https://integrate.api.nvidia.com/v1']
  },
  baseten: {
    name: 'Baseten',
    settingsNs: 'llm-pi-ai',
    urls: ['https://inference.baseten.co/v1']
  },
  'ant-ling': {
    name: 'Ant Ling',
    settingsNs: 'llm-pi-ai',
    urls: ['https://api.ant-ling.com/v1']
  },
  'qwen-token-plan': {
    name: 'Qwen Token Plan',
    settingsNs: 'llm-pi-ai',
    urls: ['https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1']
  }
});
