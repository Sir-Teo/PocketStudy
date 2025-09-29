export type ItemType = 'card' | 'mcq' | 'cloze' | 'match' | 'ordering';

export interface Concept {
  id: string;
  name: string;
  tags?: string[];
  description?: string;
}

export interface CourseItemBase {
  id: string;
  conceptIds: string[];
  type: ItemType;
  metadata?: Record<string, unknown>;
}

export interface CardItem extends CourseItemBase {
  type: 'card';
  prompt: string;
  answer: string;
  note?: string;
}

export interface McqChoice {
  id: string;
  text: string;
  correct?: boolean;
}

export interface McqItem extends CourseItemBase {
  type: 'mcq';
  stem: string;
  choices: McqChoice[];
}

export interface MatchPair {
  id: string;
  prompt: string;
  answer: string;
}

export interface MatchItem extends CourseItemBase {
  type: 'match';
  pairs: MatchPair[];
}

export interface OrderingItem extends CourseItemBase {
  type: 'ordering';
  steps: { id: string; text: string }[];
  correctOrder: string[];
}

export interface ClozeToken {
  type: 'text' | 'blank';
  value: string;
}

export interface ClozeItem extends CourseItemBase {
  type: 'cloze';
  tokens: ClozeToken[];
  answer: string[];
}

export type CourseItem = CardItem | McqItem | ClozeItem | MatchItem | OrderingItem;

export interface Course {
  id: string;
  title: string;
  version: number;
  description?: string;
  author?: string;
  tags?: string[];
  lang?: string;
  concepts: Concept[];
  items: CourseItem[];
  graphs?: {
    prereqEdges?: [string, string][];
  };
}

export type Grade = 0 | 1 | 2 | 3;

export interface ScheduleEntry {
  itemId: string;
  courseId: string;
  dueTs: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  lastGrade: Grade;
  updatedAt: number;
}

export interface AttemptLog {
  id?: number;
  itemId: string;
  ts: number;
  grade: Grade;
  latencyMs?: number;
  promptType: ItemType;
}

export interface MasteryEntry {
  conceptId: string;
  probability: number;
  lastUpdateTs: number;
}

export interface InstalledCourse {
  id: string;
  version: number;
  installedTs: number;
  title: string;
}

export interface ProfileSettings {
  dailyGoal: number;
  [key: string]: unknown;
}

export interface Profile {
  id: string;
  displayName: string;
  createdAt: number;
  settings: ProfileSettings;
}

export const DEFAULT_PROFILE_ID = 'default';
