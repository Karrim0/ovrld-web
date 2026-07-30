import { format, parseISO } from "date-fns";
import { WEEKDAYS_STARTING_SATURDAY } from "@/constants/schedule";
import { formatDateArEg } from "@/lib/localization";
import type { ISODateOnlyString, ISODateString, Weekday } from "@/types";

const WEEKDAY_BY_JS_DAY_INDEX: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function getWeekdayFromDate(date: Date): Weekday {
  return WEEKDAY_BY_JS_DAY_INDEX[date.getDay()];
}

export function sortWeekdaysStartingSaturday(weekdays: Weekday[]): Weekday[] {
  const order = WEEKDAYS_STARTING_SATURDAY;
  return [...weekdays].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

export function formatWorkoutDate(isoDate: ISODateString): string {
  return formatDateArEg(parseISO(isoDate));
}

export function getTodayISODate(): ISODateOnlyString {
  return format(new Date(), "yyyy-MM-dd");
}

export function parseISODateOnly(value: ISODateOnlyString): Date {
  return new Date(`${value}T12:00:00`);
}

export function toISODateOnly(date: Date): ISODateOnlyString {
  return format(date, "yyyy-MM-dd");
}

export function addDaysToDate(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/** Saturday is day zero for OVRLD's training week. */
export function getTrainingWeekStart(date: Date): Date {
  const dayOffsetFromSaturday = (date.getDay() + 1) % 7;
  const start = addDaysToDate(date, -dayOffsetFromSaturday);
  start.setHours(12, 0, 0, 0);
  return start;
}

export function getTrainingWeekEnd(date: Date): Date {
  return addDaysToDate(getTrainingWeekStart(date), 6);
}

export function enumerateDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  for (let current = new Date(start); current <= end; current = addDaysToDate(current, 1)) {
    dates.push(new Date(current));
  }
  return dates;
}

export function getScheduledDatesInRange(
  start: Date,
  end: Date,
  scheduledWeekdays: Weekday[],
): ISODateOnlyString[] {
  const scheduled = new Set(scheduledWeekdays);
  return enumerateDateRange(start, end)
    .filter((date) => scheduled.has(getWeekdayFromDate(date)))
    .map(toISODateOnly);
}
