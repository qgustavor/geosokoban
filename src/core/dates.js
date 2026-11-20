/** Calendar seeds use one shared UTC day, never the device's locale or screen size. */
export function utcDay (date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function isCalendarDay (value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && utcDay(date) === value
}

export function shiftDay (day, offset) {
  if (!isCalendarDay(day) || !Number.isInteger(offset)) return null
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  const next = utcDay(date)
  return isCalendarDay(next) ? next : null
}

export function isAvailableDay (day, today = utcDay()) {
  return isCalendarDay(day) && day <= today
}
