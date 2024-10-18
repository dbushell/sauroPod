/**
 * Handle console and file logging.
 * @module
 */
import * as log from "@std/log";

export const logLevel =
  (Deno.env.get("APP_LOG_LEVEL") ?? "DEBUG") as log.LevelName;
export const logLocale = "en-GB";

const dateFormat = new Intl.DateTimeFormat(logLocale, {
  dateStyle: "short",
});

const timeFormat = new Intl.DateTimeFormat(logLocale, {
  hour12: false,
  timeStyle: "medium",
});

const logFormat = (record: log.LogRecord) =>
  `${dateFormat.format(record.datetime)} ${
    timeFormat.format(record.datetime)
  } ${record.msg}`;

log.setup({
  handlers: {
    console: new log.ConsoleHandler(logLevel, {
      formatter: logFormat,
    }),
  },
  loggers: {
    default: {
      level: logLevel,
      handlers: ["console", "file"],
    },
    debug: {
      level: "DEBUG",
      handlers: ["console", "file"],
    },
  },
});

const defaultLogger = log.getLogger("default");

export { defaultLogger as log };
