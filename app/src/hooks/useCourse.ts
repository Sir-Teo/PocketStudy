import { useQuery } from '@tanstack/react-query';
import { loadCourse } from '../lib/courseLoader';

export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => {
      if (!courseId) throw new Error('Missing course id');
      return loadCourse(courseId);
    },
    enabled: Boolean(courseId),
    staleTime: 1000 * 60 * 10,
  });
}
