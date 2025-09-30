import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { loadCourse } from '../lib/courseLoader';
import type { Course } from '../lib/types';

interface GraphNodeSummary {
  id: string;
  name: string;
  mastery?: number;
  prereqs: string[];
  unlocks: string[];
}

interface CourseGraphSummary {
  course: Course;
  nodes: GraphNodeSummary[];
}

export default function KnowledgeGraphPage() {
  const installed = useLiveQuery(() => db.courses.toArray(), []);
  const mastery = useLiveQuery(() => db.mastery.toArray(), []);
  const [graphs, setGraphs] = useState<CourseGraphSummary[]>([]);

  const masteryMap = useMemo(() => {
    const map = new Map<string, number>();
    mastery?.forEach((entry) => {
      map.set(entry.conceptId, entry.probability);
    });
    return map;
  }, [mastery]);

  const key = installed?.map((entry) => `${entry.id}:${entry.version}`).join('|') ?? '';

  useEffect(() => {
    let cancelled = false;
    if (!installed) return;
    (async () => {
      const loaded = await Promise.all(
        installed.map(async (entry) => {
          try {
            return await loadCourse(entry.id);
          } catch (error) {
            console.warn('Failed to load course for graph', entry.id, error);
            return null;
          }
        }),
      );
      if (cancelled) return;
      const summaries = loaded
        .filter((course): course is Course => Boolean(course))
        .map((course) => ({ course, nodes: buildGraph(course, masteryMap) }));
      setGraphs(summaries);
    })();
    return () => {
      cancelled = true;
    };
  }, [installed, key, masteryMap]);

  return (
    <section className="graph-page">
      <h1>Knowledge graph</h1>
      {graphs.length === 0 ? <p>No courses installed yet. Install a course to see concept relationships.</p> : null}
      {graphs.map((summary) => (
        <article key={summary.course.id} className="graph-course">
          <header>
            <h2>{summary.course.title}</h2>
            <p>{summary.course.description}</p>
          </header>
          <ul className="graph-nodes">
            {summary.nodes.map((node) => (
              <li key={node.id} className="graph-node">
                <h3>{node.name}</h3>
                <p className="graph-meta">
                  Mastery:{' '}
                  {node.mastery !== undefined ? `${Math.round(node.mastery * 100)}%` : '—'}
                </p>
                <p>
                  <strong>Prerequisites:</strong>{' '}
                  {node.prereqs.length ? node.prereqs.join(', ') : 'None'}
                </p>
                <p>
                  <strong>Unlocks:</strong> {node.unlocks.length ? node.unlocks.join(', ') : '—'}
                </p>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}

function buildGraph(course: Course, mastery: Map<string, number>): GraphNodeSummary[] {
  const edges = course.graphs?.prereqEdges ?? [];
  const prereqMap = new Map<string, string[]>();
  const unlockMap = new Map<string, string[]>();

  for (const [from, to] of edges) {
    if (!prereqMap.has(to)) prereqMap.set(to, []);
    prereqMap.get(to)?.push(from);
    if (!unlockMap.has(from)) unlockMap.set(from, []);
    unlockMap.get(from)?.push(to);
  }

  const conceptName = new Map(course.concepts.map((concept) => [concept.id, concept.name]));

  return course.concepts.map((concept) => {
    const prereqs = (prereqMap.get(concept.id) ?? []).map((id) => conceptName.get(id) ?? id);
    const unlocks = (unlockMap.get(concept.id) ?? []).map((id) => conceptName.get(id) ?? id);
    return {
      id: concept.id,
      name: concept.name,
      mastery: mastery.get(concept.id),
      prereqs,
      unlocks,
    } satisfies GraphNodeSummary;
  });
}
