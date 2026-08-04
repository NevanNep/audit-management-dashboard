export function formatDueDate(dueDate: string): string {
  return new Date(dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isOverdue(dueDate: string, referenceDate: Date = new Date()): boolean {
  return new Date(dueDate) < referenceDate;
}
