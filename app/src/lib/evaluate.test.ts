import { describe, expect, it } from 'vitest';
import { isCorrectFreeResponse } from './evaluate';

describe('isCorrectFreeResponse', () => {
  it('matches regardless of whitespace and case', () => {
    expect(isCorrectFreeResponse(' Working  memory   load ', ['working memory load'])).toBe(true);
  });

  it('fails for different answers', () => {
    expect(isCorrectFreeResponse('recall', ['spaced practice'])).toBe(false);
  });
});
