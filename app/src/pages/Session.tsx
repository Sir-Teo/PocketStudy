import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ensureCourseInstalled } from '../lib/courseService';
import { recordReview } from '../lib/scheduler';
import { updateMastery } from '../lib/progress';
import { getDueQueue, type SessionQueueItem } from '../lib/sessionQueue';
import type { ClozeItem, Grade } from '../lib/types';
import { GradeButtons } from '../components/GradeButtons';

export default function SessionPage() {
  const queryClient = useQueryClient();
  const [showAnswer, setShowAnswer] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    ensureCourseInstalled('demo').catch((error) => {
      console.error('Failed to ensure demo course installed', error);
    });
  }, []);

  const { data: queue, isPending, isError, refetch } = useQuery({
    queryKey: ['session-queue'],
    queryFn: () => getDueQueue(),
    staleTime: 1000,
  });

  const current = useMemo(() => queue?.[0] ?? null, [queue]);

  useEffect(() => {
    setShowAnswer(false);
  }, [current?.schedule.itemId]);

  if (isPending) {
    return <p>Preparing your session…</p>;
  }

  if (isError) {
    return (
      <div className="error">
        <p>Could not load due items.</p>
        <button type="button" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="session-empty">
        <h2>All caught up!</h2>
        <p>No cards are due right now. Come back later or install another course.</p>
      </div>
    );
  }

  const renderCard = (entry: SessionQueueItem) => {
    switch (entry.item.type) {
      case 'card':
        return (
          <div className="prompt-card">
            <h2>{entry.item.prompt}</h2>
            {showAnswer ? (
              <div className="answer-block">
                <p>{entry.item.answer}</p>
                {entry.item.note ? <small>{entry.item.note}</small> : null}
              </div>
            ) : null}
          </div>
        );
      case 'mcq':
        return (
          <div className="prompt-card">
            <h2>{entry.item.stem}</h2>
            <ul className="choice-list">
              {entry.item.choices.map((choice) => {
                const isCorrect = Boolean(choice.correct);
                const revealed = showAnswer && isCorrect;
                return (
                  <li key={choice.id} className={revealed ? 'choice correct' : 'choice'}>
                    <span>{choice.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      case 'cloze': {
        const clozeItem = entry.item as ClozeItem;
        let blankIndex = -1;
        return (
          <div className="prompt-card">
            <p className="cloze-text">
              {clozeItem.tokens.map((token, index) => {
                if (token.type === 'text') {
                  return <span key={index}>{token.value}</span>;
                }
                blankIndex += 1;
                const answerText = clozeItem.answer[blankIndex] ?? '';
                return (
                  <span key={index} className="blank">
                    {showAnswer ? answerText : '____'}
                  </span>
                );
              })}
            </p>
          </div>
        );
      }
      default:
        return <p>Unsupported item.</p>;
    }
  };

  const handleGrade = async (grade: Grade) => {
    if (!current) return;
    setIsRecording(true);
    try {
      await recordReview(current.schedule.itemId, grade, current.item.type);
      await updateMastery([current.item], grade);
      await queryClient.invalidateQueries({ queryKey: ['session-queue'] });
      await queryClient.refetchQueries({ queryKey: ['session-queue'], type: 'active' });
    } finally {
      setIsRecording(false);
      setShowAnswer(false);
    }
  };

  return (
    <main className="session-page">
      <header className="session-header">
        <div>
          <h1>{current.course.title}</h1>
          <p>{queue?.length ?? 0} left today</p>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => setShowAnswer(true)}
          disabled={showAnswer}
        >
          Reveal
        </button>
      </header>
      <section className="session-body">{renderCard(current)}</section>
      <footer className="session-footer">
        <GradeButtons onSelect={handleGrade} disabled={isRecording || !showAnswer} />
        {!showAnswer ? <p className="hint">Reveal the answer before grading.</p> : null}
      </footer>
    </main>
  );
}
