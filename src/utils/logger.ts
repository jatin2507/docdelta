import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private static level: LogLevel = LogLevel.INFO;

  static setLevel(level: LogLevel): void {
    Logger.level = level;
  }

  static debug(...args: any[]): void {
    if (Logger.level <= LogLevel.DEBUG) {
      console.log(chalk.gray('[DEBUG]'), ...args);
    }
  }

  static info(...args: any[]): void {
    if (Logger.level <= LogLevel.INFO) {
      console.log(chalk.blue('[INFO]'), ...args);
    }
  }

  static warn(...args: any[]): void {
    if (Logger.level <= LogLevel.WARN) {
      console.warn(chalk.yellow('[WARN]'), ...args);
    }
  }

  static error(...args: any[]): void {
    if (Logger.level <= LogLevel.ERROR) {
      console.error(chalk.red('[ERROR]'), ...args);
    }
  }

  static success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  static fail(message: string): void {
    console.log(chalk.red('✗'), message);
  }
}