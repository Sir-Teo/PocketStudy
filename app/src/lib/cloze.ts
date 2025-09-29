import type { ClozeItem, ClozeToken } from './types';

const CLOZE_PATTERN = /\{\{([^}]+)\}\}/g;

export interface ClozeTemplateResult {
  tokens: ClozeToken[];
  answers: string[];
}

export function buildClozeFromTemplate(template: string): ClozeTemplateResult {
  if (typeof template !== 'string' || !template.trim()) {
    throw new Error('Cloze template must be a non-empty string');
  }

  const tokens: ClozeToken[] = [];
  const answers: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CLOZE_PATTERN.exec(template)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: template.slice(lastIndex, match.index) });
    }

    const answer = match[1].trim();
    if (!answer) {
      throw new Error('Cloze template contains an empty blank');
    }

    tokens.push({ type: 'blank', value: answer });
    answers.push(answer);
    lastIndex = match.index + match[0].length;
  }

  if (tokens.length === 0) {
    throw new Error('Cloze template must contain at least one {{blank}}');
  }

  if (lastIndex < template.length) {
    tokens.push({ type: 'text', value: template.slice(lastIndex) });
  }

  return { tokens, answers };
}

export function normalizeClozeItem(item: ClozeItem): ClozeItem {
  const blanks = item.tokens.filter((token) => token.type === 'blank').length;
  if (blanks !== item.answer.length) {
    throw new Error(`Cloze item ${item.id} has ${blanks} blanks but ${item.answer.length} answers`);
  }
  return item;
}
