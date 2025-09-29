import { describe, expect, it } from 'vitest';
import { buildClozeFromTemplate } from './cloze';

describe('buildClozeFromTemplate', () => {
  it('produces tokens and answers from a template string', () => {
    const template = 'Spacing practice {{improves}} {{retention}}.';
    const { tokens, answers } = buildClozeFromTemplate(template);

    expect(tokens).toHaveLength(5);
    expect(tokens[1]).toMatchObject({ type: 'blank', value: 'improves' });
    expect(tokens[3]).toMatchObject({ type: 'blank', value: 'retention' });
    expect(answers).toEqual(['improves', 'retention']);
  });

  it('throws when template contains no blanks', () => {
    expect(() => buildClozeFromTemplate('No blanks here.')).toThrow();
  });
});
