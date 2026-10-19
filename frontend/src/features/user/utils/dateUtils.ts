export const formatDate = (value?: Date | string): string => {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
};
