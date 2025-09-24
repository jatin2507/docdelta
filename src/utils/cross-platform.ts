import * as path from 'path';
import * as os from 'os';

export class CrossPlatform {
  static normalizePath(filePath: string): string {
    // Convert Windows backslashes to forward slashes for consistency
    return filePath.replace(/\\/g, '/');
  }

  static denormalizePath(filePath: string): string {
    // Convert to platform-specific separators
    if (os.platform() === 'win32') {
      return filePath.replace(/\//g, '\\');
    }
    return filePath;
  }

  static joinPath(...parts: string[]): string {
    // Use path.join for platform-specific joining, then normalize
    return this.normalizePath(path.join(...parts));
  }

  static resolvePath(...parts: string[]): string {
    // Use path.resolve for absolute paths, then normalize
    return this.normalizePath(path.resolve(...parts));
  }

  static relativePath(from: string, to: string): string {
    // Get relative path and normalize
    return this.normalizePath(path.relative(from, to));
  }

  static getHomeDir(): string {
    return os.homedir();
  }

  static getTempDir(): string {
    return os.tmpdir();
  }

  static isAbsolutePath(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  static getPathSeparator(): string {
    return path.sep;
  }

  static getExtension(filePath: string): string {
    return path.extname(filePath);
  }

  static getBasename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }

  static getDirname(filePath: string): string {
    return this.normalizePath(path.dirname(filePath));
  }

  static ensureForwardSlashes(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  static ensureBackslashes(filePath: string): string {
    return filePath.replace(/\//g, '\\');
  }

  static toPosixPath(filePath: string): string {
    return filePath.split(path.sep).join(path.posix.sep);
  }

  static toWindowsPath(filePath: string): string {
    return filePath.split(path.posix.sep).join(path.win32.sep);
  }

  static isWindows(): boolean {
    return os.platform() === 'win32';
  }

  static isMac(): boolean {
    return os.platform() === 'darwin';
  }

  static isLinux(): boolean {
    return os.platform() === 'linux';
  }

  static getPlatform(): NodeJS.Platform {
    return os.platform();
  }

  static getExecutableExtension(): string {
    return this.isWindows() ? '.exe' : '';
  }

  static getScriptExtension(): string {
    return this.isWindows() ? '.bat' : '.sh';
  }

  static normalizeLineEndings(content: string, target: 'LF' | 'CRLF' = 'LF'): string {
    if (target === 'LF') {
      return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    } else {
      return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
    }
  }

  static getLineEnding(): string {
    return this.isWindows() ? '\r\n' : '\n';
  }
}