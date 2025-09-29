import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import KnowledgeGraphPage from './KnowledgeGraph';
import { db } from '../lib/db';
import { renderWithProviders } from '../testUtils';

import type { Course } from '../lib/types';

const course: Course = {
  id: 'graph-course',
  title: 'Graph Course',
  description: 'Relationships between concepts',
  version: 1,
  concepts: [
    { id: 'concept.alpha', name: 'Concept Alpha' },
    { id: 'concept.beta', name: 'Concept Beta' },
  ],
  items: [],
  graphs: {
    prereqEdges: [['concept.alpha', 'concept.beta']],
  },
};

describe('KnowledgeGraphPage', () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.close();
    await db.delete();
    await db.open();

    await db.customCourses.put(course);
    await db.courses.put({
      id: course.id,
      title: course.title,
      version: course.version,
      installedTs: Date.now(),
    });

    await db.mastery.bulkPut([
      { conceptId: 'concept.alpha', probability: 0.9, lastUpdateTs: Date.now() },
      { conceptId: 'concept.beta', probability: 0.4, lastUpdateTs: Date.now() },
    ]);
  });

  it('renders concept prerequisite relationships with mastery', async () => {
    renderWithProviders(<KnowledgeGraphPage />);

    await screen.findByRole('heading', { name: /graph course/i });

    const alphaNode = await screen.findByRole('heading', { name: /concept alpha/i });
    const alphaCard = alphaNode.closest('.graph-node');
    expect(alphaCard?.textContent).toContain('Mastery: 90%');
    expect(alphaCard?.textContent).toContain('Unlocks: Concept Beta');

    const betaNode = screen.getByRole('heading', { name: /concept beta/i });
    const betaCard = betaNode.closest('.graph-node');
    expect(betaCard?.textContent).toContain('Prerequisites: Concept Alpha');
  });
});
