// Saving a test in progress to the browser (localStorage), so a participant who
// closes the tab or loses the connection can resume where they left off.
// Every storage access is wrapped in try/catch: without storage (private
// windows, blocked site data) the test still works, it just cannot be resumed.

const KEY_PREFIX = 'quizzer:progress:';
const FORMAT_VERSION = 1;

export function progressKey(quizId) {
  return `${KEY_PREFIX}${quizId}`;
}

// A short hash of the quiz's (validated) questions, content included. When any
// question changes (an id, a word of a "spot" text, an option…), the fingerprint
// changes and old saved progress is discarded, since saved answers may no longer fit.
export function quizFingerprint(questions) {
  const source = JSON.stringify(questions);
  let hash = 5381;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash * 33) ^ source.charCodeAt(index)) >>> 0;
  }
  return `${questions.length}-${hash.toString(36)}`;
}

// The page's localStorage, or null when the browser does not allow it.
export function getStorage(win = globalThis.window) {
  try {
    const storage = win && win.localStorage;
    if (!storage) return null;
    const probe = `${KEY_PREFIX}probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

// state: { order: [question ids], index, selections: { id: answer }, name,
//          startedAt, deadline (ms timestamps), timeSpent: { id: ms }, optionOrder: { id: [options] },
//          cohortCode, cohortLabel }
export function saveProgress(storage, quizId, fingerprint, state) {
  if (!storage) return false;
  try {
    const record = { version: FORMAT_VERSION, fingerprint, savedAt: Date.now(), ...state };
    storage.setItem(progressKey(quizId), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(storage, quizId) {
  if (!storage) return;
  try {
    storage.removeItem(progressKey(quizId));
  } catch {
    // Nothing to do: the progress simply stays until the browser clears it.
  }
}

function isValidRecord(record) {
  return (
    record !== null &&
    typeof record === 'object' &&
    Array.isArray(record.order) &&
    Number.isInteger(record.index) &&
    record.selections !== null && typeof record.selections === 'object' &&
    Number.isFinite(record.deadline) &&
    Number.isFinite(record.startedAt)
  );
}

// The saved progress for this quiz, or null if there is none, it is unreadable,
// or it was saved for a different version of the quiz (it is then removed).
export function loadProgress(storage, quizId, fingerprint) {
  if (!storage) return null;
  let raw;
  try {
    raw = storage.getItem(progressKey(quizId));
  } catch {
    return null;
  }
  if (!raw) return null;

  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    clearProgress(storage, quizId);
    return null;
  }
  if (!isValidRecord(record) || record.version !== FORMAT_VERSION || record.fingerprint !== fingerprint) {
    clearProgress(storage, quizId);
    return null;
  }
  return {
    order: record.order,
    index: record.index,
    selections: record.selections,
    name: typeof record.name === 'string' ? record.name : '',
    startedAt: record.startedAt,
    deadline: record.deadline,
    timeSpent: record.timeSpent && typeof record.timeSpent === 'object' ? record.timeSpent : {},
    optionOrder: record.optionOrder && typeof record.optionOrder === 'object' ? record.optionOrder : {},
    // The cohort code given on the start screen, and its label once checked.
    cohortCode: typeof record.cohortCode === 'string' ? record.cohortCode : '',
    cohortLabel: typeof record.cohortLabel === 'string' ? record.cohortLabel : '',
  };
}

// The questions in the saved order, or null if a saved id no longer exists.
export function restoreQuestionOrder(order, questions) {
  const byId = new Map(questions.map((question) => [String(question.id), question]));
  const restored = order.map((id) => byId.get(String(id)));
  return restored.every(Boolean) && restored.length > 0 ? restored : null;
}

export function computeDeadline(startedAt, timeLimitSeconds) {
  return startedAt + timeLimitSeconds * 1000;
}

// Whole seconds left before the deadline (never negative).
export function secondsLeft(deadline, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function isExpired(deadline, now = Date.now()) {
  return now >= deadline;
}
