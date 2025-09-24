import { TypeScriptParser } from '../core/parser/typescript-parser';
import { PythonParser } from '../core/parser/python-parser';
import { SQLParser } from '../core/parser/sql-parser';
import { ChunkType } from '../types';

describe('TypeScriptParser', () => {
  let parser: TypeScriptParser;

  beforeEach(() => {
    parser = new TypeScriptParser();
  });

  test('should parse TypeScript functions', () => {
    const code = `
      export function testFunction(param: string): string {
        return param.toUpperCase();
      }
    `;

    const chunks = parser.extractChunks(code, 'test.ts');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe(ChunkType.FUNCTION);
    expect(chunks[0].metadata?.name).toBe('testFunction');
  });

  test('should parse TypeScript classes', () => {
    const code = `
      export class TestClass {
        private value: string;

        constructor(value: string) {
          this.value = value;
        }

        getValue(): string {
          return this.value;
        }
      }
    `;

    const chunks = parser.extractChunks(code, 'test.ts');
    const classChunk = chunks.find(c => c.type === ChunkType.CLASS);
    const methodChunk = chunks.find(c => c.type === ChunkType.METHOD);

    expect(classChunk).toBeDefined();
    expect(classChunk?.metadata?.name).toBe('TestClass');
    expect(methodChunk).toBeDefined();
    expect(methodChunk?.metadata?.name).toBe('TestClass.getValue');
  });

  test('should extract dependencies', () => {
    const code = `
      import { Component } from '@angular/core';
      import * as lodash from 'lodash';
      const express = require('express');
    `;

    const dependencies = parser.extractDependencies(code);
    expect(dependencies).toContain('@angular/core');
    expect(dependencies).toContain('lodash');
    expect(dependencies).toContain('express');
  });
});

describe('PythonParser', () => {
  let parser: PythonParser;

  beforeEach(() => {
    parser = new PythonParser();
  });

  test('should parse Python functions', () => {
    const code = `
def test_function(param: str) -> str:
    """Test function docstring"""
    return param.upper()
    `;

    const chunks = parser.extractChunks(code, 'test.py');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe(ChunkType.FUNCTION);
    expect(chunks[0].metadata?.name).toBe('test_function');
  });

  test('should parse Python classes', () => {
    const code = `
class TestClass:
    """Test class docstring"""

    def __init__(self, value):
        self.value = value

    def get_value(self):
        return self.value
    `;

    const chunks = parser.extractChunks(code, 'test.py');
    const classChunk = chunks.find(c => c.type === ChunkType.CLASS);
    const methodChunks = chunks.filter(c => c.type === ChunkType.METHOD);

    expect(classChunk).toBeDefined();
    expect(classChunk?.metadata?.name).toBe('TestClass');
    expect(methodChunks).toHaveLength(2);
  });

  test('should extract Python imports', () => {
    const code = `
import os
from typing import List, Dict
from .models import User
import numpy as np
    `;

    const dependencies = parser.extractDependencies(code);
    expect(dependencies).toContain('os');
    expect(dependencies).toContain('typing');
    expect(dependencies).toContain('.models');
    expect(dependencies).toContain('numpy');
  });
});

describe('SQLParser', () => {
  let parser: SQLParser;

  beforeEach(() => {
    parser = new SQLParser();
  });

  test('should parse SQL tables', () => {
    const code = `
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
    `;

    const chunks = parser.extractChunks(code, 'schema.sql');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe(ChunkType.DATABASE_TABLE);
    expect(chunks[0].metadata?.name).toBe('users');

    const columns = chunks[0].metadata?.columns;
    expect(columns).toHaveLength(4);
    expect(columns[0].name).toBe('id');
    expect(columns[0].isPrimaryKey).toBe(true);
  });

  test('should parse foreign keys', () => {
    const code = `
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT,
    total DECIMAL(10, 2),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
    `;

    const chunks = parser.extractChunks(code, 'schema.sql');
    const table = chunks[0];
    const userIdColumn = table.metadata?.columns.find((c: any) => c.name === 'user_id');

    expect(userIdColumn?.isForeignKey).toBe(true);
  });
});