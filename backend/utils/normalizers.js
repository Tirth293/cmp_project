const collapseWhitespace = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const normalizeEmail = (email) => collapseWhitespace(email).toLowerCase();

const KNOWN_BRANCHES = {
  'ashram road': 'Ashram Road',
  maninagar: 'Maninagar'
};

const titleCase = (value) =>
  value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const normalizeBranch = (branch, fallback = 'Ashram Road') => {
  const cleaned = collapseWhitespace(branch);
  if (!cleaned) return fallback;

  const known = KNOWN_BRANCHES[cleaned.toLowerCase()];
  return known || titleCase(cleaned);
};

module.exports = {
  collapseWhitespace,
  normalizeEmail,
  normalizeBranch
};
