const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

export type TimestampUnit = 'seconds' | 'milliseconds';

export type TimeZoneTime = {
  readonly date: string;
  readonly time: string;
  readonly offset: string;
};

export function getUnixTimestamp(date: Date = new Date()): number {
  return Math.floor(date.getTime() / MILLISECONDS_PER_SECOND);
}

export function getUnixMilliseconds(date: Date = new Date()): number {
  return date.getTime();
}

export function formatTimestamp(date: Date, unit: TimestampUnit): string {
  return unit === 'milliseconds'
    ? String(getUnixMilliseconds(date))
    : String(getUnixTimestamp(date));
}

export function parseTimestamp(value: string, unit: TimestampUnit = 'seconds'): Date | null {
  if (!/^-?\d+$/u.test(value.trim())) {
    return null;
  }

  const timestamp = Number.parseInt(value, 10);
  const milliseconds = unit === 'milliseconds'
    ? timestamp
    : timestamp * MILLISECONDS_PER_SECOND;
  const date = new Date(milliseconds);

  return Number.isNaN(date.getTime()) ? null : date;
}

const EXPLICIT_TIME_ZONE_PATTERN = /(?:Z|UTC|GMT|[+-]\d{2}:\d{2}|(?::\d{2}[+-]\d{2}))$/iu;

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(parts.find((part) => part.type === type)?.value ?? '', 10);

  return Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour'),
    getPart('minute'),
    getPart('second'),
    date.getMilliseconds(),
  ) - date.getTime();
}

export function parseDateString(value: string, timeZone = getDefaultTimeZone()): Date | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // JavaScript parses date strings without an offset by using the browser
  // zone. Recalculate that naive wall time in the tool's selected zone.
  if (EXPLICIT_TIME_ZONE_PATTERN.test(value.trim())) {
    return date;
  }

  const browserTimeZone = getDefaultTimeZone();
  const naiveWallTimeUtc =
    date.getTime() + getTimeZoneOffsetMs(date, browserTimeZone);
  let timestamp = naiveWallTimeUtc;

  for (let iteration = 0; iteration < 2; iteration += 1) {
    timestamp = naiveWallTimeUtc - getTimeZoneOffsetMs(new Date(timestamp), timeZone);
  }

  const zonedDate = new Date(timestamp);

  return Number.isNaN(zonedDate.getTime()) ? null : zonedDate;
}

export function formatRelativeTime(
  timestamp: Date,
  now: Date = new Date(),
  locale = 'en',
): string {
  const differenceSeconds = Math.floor((timestamp.getTime() - now.getTime()) / MILLISECONDS_PER_SECOND);
  const elapsed = Math.abs(differenceSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (elapsed === 0) {
    return formatter.format(0, 'second');
  }
  const direction = differenceSeconds < 0 ? -1 : 1;

  if (elapsed < SECONDS_PER_MINUTE) {
    return formatter.format(direction * elapsed, 'second');
  }
  if (elapsed < SECONDS_PER_HOUR) {
    return formatter.format(direction * Math.floor(elapsed / SECONDS_PER_MINUTE), 'minute');
  }
  if (elapsed < SECONDS_PER_DAY) {
    return formatter.format(direction * Math.floor(elapsed / SECONDS_PER_HOUR), 'hour');
  }

  return formatter.format(direction * Math.floor(elapsed / SECONDS_PER_DAY), 'day');
}

const FALLBACK_TIME_ZONES = [
  'UTC',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
];

export function getDefaultTimeZone(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function getTimeZones(): readonly string[] {
  const supportedTimeZones = Intl.supportedValuesOf?.('timeZone') ?? [];

  return [...new Set([...supportedTimeZones, ...FALLBACK_TIME_ZONES])]
    .sort((first, second) => first.localeCompare(second));
}

export function formatTimeZoneTime(
  date: Date,
  locale: string,
  timeZone: string,
): TimeZoneTime | null {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'longOffset',
    }).formatToParts(date);
    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '';

    return {
      date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
      time: `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`,
      offset: getPart('timeZoneName') || 'UTC',
    };
  } catch {
    return null;
  }
}
