export function formatDueDate(dueDate?: string): string {
  if (!dueDate) return '—';
  return new Date(dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isOverdue(dueDate?: string, referenceDate: Date = new Date()): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < referenceDate;
}
