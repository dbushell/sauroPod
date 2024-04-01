/**
 * Handle console and file logging.
 * @module
 */
import * as fs from 'fs';
import * as log from 'log';
import * as path from 'path';

const logPath = Deno.env.get('APP_LOG_PATH') ?? path.join(Deno.cwd(), './.log');
export const logLevel = (Deno.env.get('APP_LOG_LEVEL') ?? 'DEBUG') as log.LevelName;
export const logLocale = 'en-GB';

await fs.ensureDir(logPath);

const dateFormat = new Intl.DateTimeFormat(logLocale, {
  dateStyle: 'short'
});

const timeFormat = new Intl.DateTimeFormat(logLocale, {
  hour12: false,
  timeStyle: 'medium'
});

const logFormat = (record: log.LogRecord) =>
  `${dateFormat.format(record.datetime)} ${timeFormat.format(record.datetime)} ${record.msg}`;

log.setup({
  handlers: {
    console: new log.ConsoleHandler(logLevel, {
      formatter: logFormat
    }),
    file: new log.RotatingFileHandler('DEBUG', {
      formatter: logFormat,
      filename: path.join(logPath, 'debug.log'),
      maxBytes: 1024 * 1024 * 1,
      maxBackupCount: 10
    })
  },
  loggers: {
    default: {
      level: logLevel,
      handlers: ['console', 'file']
    },
    debug: {
      level: 'DEBUG',
      handlers: ['console', 'file']
    }
  }
});
