import { describe, expect, it } from 'vitest';
import { augmentMcqDistractors } from './distractors';
import type { Course } from './types';

describe('augmentMcqDistractors', () => {
  it('fills MCQ items up to four choices using tag pools', () => {
    const course: Course = {
      id: 'course-1',
      title: 'Test',
      version: 1,
      concepts: [
        { id: 'concept.one', name: 'Concept One', tags: ['alpha'] },
        { id: 'concept.two', name: 'Concept Two', tags: ['alpha'] },
      ],
      items: [
        {
          id: 'card.one.1',
          type: 'card',
          conceptIds: ['concept.one'],
          prompt: 'What is one?',
          answer: 'Answer One',
        },
        {
          id: 'mcq.two.1',
          type: 'mcq',
          conceptIds: ['concept.two'],
          stem: 'Select the correct answer',
          choices: [
            { id: 'choice-1', text: 'Correct choice', correct: true },
            { id: 'choice-2', text: 'Existing distractor' },
          ],
        },
      ],
    };

    const augmented = augmentMcqDistractors(course);
    const mcq = augmented.items.find((item) => item.type === 'mcq');
    expect(mcq).toBeDefined();
    if (mcq && mcq.type === 'mcq') {
      expect(mcq.choices).toHaveLength(4);
      const uniqueTexts = new Set(mcq.choices.map((choice) => choice.text));
      expect(uniqueTexts.size).toBe(mcq.choices.length);
    }
  });
});
