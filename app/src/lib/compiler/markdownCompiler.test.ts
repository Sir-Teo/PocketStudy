import { describe, expect, it } from 'vitest';
import { compileMarkdownCourse, MarkdownCompileError } from './markdownCompiler';

describe('compileMarkdownCourse', () => {
  const sample = `# Title: Intro to Memory
# Lang: en
# Tags: cognition, basics
# Description: Core cognitive science foundations

## Concept: Active recall (concept_id: memory.recall)
Definition: Actively retrieving information from memory without cues strengthens retention.
Quiz:
- MCQ: "Active recall is valuable because ___" | ["it strengthens retrieval pathways","it reduces effort","it avoids spaced practice"] | 0
- Cloze: "Active recall relies on {{retrieval practice}} rather than rereading."

## Concept: Spaced practice (concept_id: memory.spacing)
Definition: Spreading study sessions across time improves consolidation.
Quiz:
- Card: "Key benefit of spacing" | "Combats forgetting and builds durable memories"`;

  it('produces a normalized course with items for definitions and quizzes', () => {
    const { course, warnings } = compileMarkdownCourse(sample);
    expect(warnings).toHaveLength(0);
    expect(course.id).toBe('authored-intro-to-memory');
    expect(course.title).toBe('Intro to Memory');
    expect(course.lang).toBe('en');
    expect(course.tags).toEqual(['cognition', 'basics']);
    expect(course.concepts).toHaveLength(2);
    expect(course.items).toHaveLength(5);
    const cloze = course.items.find((item) => item.type === 'cloze');
    expect(cloze?.id).toMatch(/^cloze\./);
  });

  it('throws a MarkdownCompileError when required directives are missing', () => {
    expect(() => compileMarkdownCourse('## Concept: Missing Title')).toThrowError(MarkdownCompileError);
  });

  it('surfaces invalid MCQ structures as errors', () => {
    const invalid = `# Title: Bad MCQ\n\n## Concept: Concept One\nDefinition: Something\nQuiz:\n- MCQ: "Broken" | ["choice"] | 4`;
    try {
      compileMarkdownCourse(invalid);
      throw new Error('Expected compile to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(MarkdownCompileError);
      expect((error as MarkdownCompileError).messages.some((message) => message.includes('Correct choice index out of bounds'))).toBe(true);
    }
  });
});
