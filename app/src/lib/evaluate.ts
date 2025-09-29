export function isCorrectFreeResponse(input: string, answers: string[]) {
  const normalizedInput = normalize(input);
  return answers.some((answer) => normalizedInput === normalize(answer));
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
