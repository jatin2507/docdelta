import * as fs from 'fs-extra';
import * as path from 'path';
import { globby } from 'globby';

export class FileUtils {
  static async findFiles(
    directory: string,
    patterns: string[],
    exclude?: string[]
  ): Promise<string[]> {
    return await globby(patterns, {
      cwd: directory,
      absolute: true,
      ignore: exclude || [],
    });
  }

  static async readFilesSafe(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error);
      return null;
    }
  }

  static async ensureDirectoryExists(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  static async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.copy(src, dest);
  }

  static async removeDirectory(dirPath: string): Promise<void> {
    await fs.remove(dirPath);
  }

  static getFileExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  static getFileName(filePath: string, includeExtension: boolean = true): string {
    if (includeExtension) {
      return path.basename(filePath);
    }
    return path.basename(filePath, path.extname(filePath));
  }

  static getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  static async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  static async isDirectory(path: string): Promise<boolean> {
    try {
      const stats = await fs.stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  static async isFile(path: string): Promise<boolean> {
    try {
      const stats = await fs.stat(path);
      return stats.isFile();
    } catch {
      return false;
    }
  }
}