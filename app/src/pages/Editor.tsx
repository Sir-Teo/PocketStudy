import { type FormEvent, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { compileMarkdownCourse, MarkdownCompileError } from '../lib/compiler/markdownCompiler';
import { installCompiledCourse } from '../lib/courseService';
import type { Course } from '../lib/types';

const SAMPLE_MARKDOWN = `# Title: Learning Science Sampler
# Lang: en
# Tags: learning, demo
# Description: Core techniques for effective self-study

## Concept: Active recall (concept_id: memory.active_recall)
Definition: Retrieving information from memory without cues reinforces neural pathways.
Quiz:
- MCQ: "Active recall helps because ___" | ["it strengthens retrieval pathways","it reduces practice","it skips spaced repetition"] | 0
- Cloze: "Active recall depends on {{effortful retrieval}} instead of rereading."

## Concept: Spaced practice (concept_id: memory.spaced_practice)
Definition: Spreading study sessions across time improves long-term retention.
Quiz:
- Card: "Spacing combats" | "The forgetting curve"`;

type CompileState =
  | { status: 'idle' }
  | { status: 'success'; course: Course; warnings: string[] }
  | { status: 'error'; errors: string[] };

type InstallState = 'idle' | 'working' | 'success' | 'error';

export default function EditorPage() {
  const [markdown, setMarkdown] = useState<string>(SAMPLE_MARKDOWN);
  const [compileState, setCompileState] = useState<CompileState>({ status: 'idle' });
  const [installState, setInstallState] = useState<InstallState>('idle');
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleCompile = (event: FormEvent) => {
    event.preventDefault();
    try {
      const { course, warnings } = compileMarkdownCourse(markdown);
      setCompileState({ status: 'success', course, warnings });
    } catch (error) {
      if (error instanceof MarkdownCompileError) {
        setCompileState({ status: 'error', errors: error.messages });
      } else {
        setCompileState({ status: 'error', errors: ['Unexpected compiler failure.'] });
      }
    }
  };

  const installableCourse = useMemo(() => {
    return compileState.status === 'success' ? compileState.course : null;
  }, [compileState]);

  const handleInstall = async () => {
    if (!installableCourse) return;
    setInstallState('working');
    setInstallMessage(null);
    try {
      await installCompiledCourse(installableCourse);
      await queryClient.invalidateQueries({ queryKey: ['session-queue'] });
      await queryClient.invalidateQueries({ queryKey: ['course-index'] });
      setInstallState('success');
      setInstallMessage(`Installed course "${installableCourse.title}".`);
    } catch (error) {
      console.error('Failed to install compiled course', error);
      setInstallState('error');
      setInstallMessage('Install failed. See console for details.');
    }
  };

  return (
    <main className="editor-page">
      <h1>Author a Course</h1>
      <p className="help-text">
        Paste markdown that follows the PocketStudy authoring spec. Compile to preview, then install locally.
      </p>

      <form className="editor-form" onSubmit={handleCompile}>
        <label htmlFor="markdown-input">Markdown source</label>
        <textarea
          id="markdown-input"
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
          rows={18}
          spellCheck="false"
        />
        <div className="editor-actions">
          <button type="submit" className="primary">
            Compile
          </button>
          <button
            type="button"
            className="secondary"
            onClick={handleInstall}
            disabled={!installableCourse || installState === 'working'}
          >
            {installState === 'working' ? 'Installing…' : 'Install compiled course'}
          </button>
        </div>
      </form>

      {compileState.status === 'error' ? (
        <div className="editor-messages error">
          <h2>Compilation errors</h2>
          <ul>
            {compileState.errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {compileState.status === 'success' ? (
        <section className="editor-preview">
          <header>
            <h2>Preview</h2>
            <p>
              {compileState.course.concepts.length} concepts · {compileState.course.items.length} items · id:{' '}
              <code>{compileState.course.id}</code>
            </p>
          </header>
          {compileState.warnings.length ? (
            <div className="editor-messages warning">
              <h3>Warnings</h3>
              <ul>
                {compileState.warnings.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <pre>{JSON.stringify(compileState.course, null, 2)}</pre>
        </section>
      ) : null}

      {installMessage ? (
        <p className={`status-message${installState === 'error' ? ' error' : ''}`}>{installMessage}</p>
      ) : null}
    </main>
  );
}
