// Mapování mezi tvarem dat v React state (camelCase) a v Postgres řádcích (snake_case).
// Cíl: každý záznam má v cloudu user_id, ale v lokálním state ho nedržíme — připojí ho push funkce.

const nullIfBlank = (v) => (v === '' || v === undefined ? null : v);

// ===== tasks =====
export const taskToRow = (task, userId) => ({
  id: task.id,
  user_id: userId,
  title: task.title,
  category_id: task.categoryId,
  scheduled_date: nullIfBlank(task.scheduledDate),
  time: nullIfBlank(task.time),
  notification: nullIfBlank(task.notification),
  completed: Boolean(task.completed),
  completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : null,
});
export const rowToTask = (r) => ({
  id: r.id,
  title: r.title,
  categoryId: r.category_id,
  scheduledDate: r.scheduled_date || null,
  time: r.time || null,
  notification: r.notification || null,
  completed: Boolean(r.completed),
  completedAt: r.completed_at ? new Date(r.completed_at).getTime() : null,
});

// ===== events =====
export const eventToRow = (e, userId) => ({
  id: e.id,
  user_id: userId,
  type: e.type,
  date: e.date,
  end_date: nullIfBlank(e.endDate),
  time: nullIfBlank(e.time),
  end_time: nullIfBlank(e.endTime),
  person: e.person,
  location: nullIfBlank(e.location),
  custom_label: nullIfBlank(e.customLabel),
  notification: nullIfBlank(e.notification),
});
export const rowToEvent = (r) => ({
  id: r.id,
  type: r.type,
  date: r.date,
  endDate: r.end_date || null,
  time: r.time || null,
  endTime: r.end_time || null,
  person: r.person,
  location: r.location || null,
  customLabel: r.custom_label || null,
  notification: r.notification || null,
});

// ===== categories =====
export const categoryToRow = (c, userId, position = 0) => ({
  id: c.id,
  user_id: userId,
  name: c.name,
  color: c.color,
  position,
});
export const rowToCategory = (r) => ({ id: r.id, name: r.name, color: r.color });

// ===== people =====
export const personToRow = (p, userId) => ({
  id: p.id,
  user_id: userId,
  name: p.name,
  surname: nullIfBlank(p.surname),
  name_day: nullIfBlank(p.nameDay),
  birthday: nullIfBlank(p.birthday),
});
export const rowToPerson = (r) => ({
  id: r.id,
  name: r.name,
  surname: r.surname || null,
  nameDay: r.name_day || null,
  birthday: r.birthday || null,
});

// ===== mini_notes =====
export const miniNoteToRow = (n, userId) => ({
  id: n.id,
  user_id: userId,
  title: nullIfBlank(n.title),
  body: n.body || '',
  pinned: Boolean(n.pinned),
  created_at: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
});
export const rowToMiniNote = (r) => ({
  id: r.id,
  title: r.title || null,
  body: r.body || '',
  pinned: Boolean(r.pinned),
  createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
});

// ===== anniversaries =====
export const anniversaryToRow = (a, userId) => ({
  id: a.id,
  user_id: userId,
  title: a.title,
  original_date: a.originalDate,
  meta: nullIfBlank(a.meta),
  message: nullIfBlank(a.message),
  source_type: a.sourceType,
  source_event_id: nullIfBlank(a.sourceEventId),
  saved_at: a.savedAt ? new Date(a.savedAt).toISOString() : new Date().toISOString(),
});
export const rowToAnniversary = (r) => ({
  id: r.id,
  title: r.title,
  originalDate: r.original_date,
  meta: r.meta || null,
  message: r.message || null,
  sourceType: r.source_type,
  sourceEventId: r.source_event_id || null,
  savedAt: r.saved_at ? new Date(r.saved_at).getTime() : Date.now(),
});
