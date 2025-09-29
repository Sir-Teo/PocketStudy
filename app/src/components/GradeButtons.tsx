import type { Grade } from '../lib/types';

interface GradeButtonsProps {
  onSelect: (grade: Grade) => void;
  disabled?: boolean;
}

const gradeLabels: Record<Grade, string> = {
  0: 'Again',
  1: 'Hard',
  2: 'Good',
  3: 'Easy',
};

export function GradeButtons({ onSelect, disabled }: GradeButtonsProps) {
  const gradeValues: Grade[] = [0, 1, 2, 3];
  return (
    <div className="grade-buttons">
      {gradeValues.map((grade) => (
        <button
          key={grade}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(grade)}
          className={`grade grade-${grade}`}
        >
          {gradeLabels[grade]}
        </button>
      ))}
    </div>
  );
}
