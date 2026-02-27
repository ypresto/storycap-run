import { describe, test, expect } from 'vitest';
import { parseStoryPatterns } from './filter.js';

describe('parseStoryPatterns', () => {
  test('returns empty filters for empty patterns', () => {
    const result = parseStoryPatterns([], []);
    expect(result).toEqual({ fileFilters: [], testNamePattern: undefined });
  });

  test('parses "Button/*" as file filter only', () => {
    const result = parseStoryPatterns(['Button/*'], []);
    expect(result.fileFilters).toEqual(['Button']);
    expect(result.testNamePattern).toBeUndefined();
  });

  test('parses "Button/Primary" as file filter + name pattern', () => {
    const result = parseStoryPatterns(['Button/Primary'], []);
    expect(result.fileFilters).toEqual(['Button']);
    expect(result.testNamePattern!.test('Primary')).toBe(true);
    expect(result.testNamePattern!.test('Secondary')).toBe(false);
  });

  test('parses nested title "Components/Button/*" using last separator', () => {
    const result = parseStoryPatterns(['Components/Button/*'], []);
    expect(result.fileFilters).toEqual(['Components/Button']);
    expect(result.testNamePattern).toBeUndefined();
  });

  test('parses multiple file-only patterns', () => {
    const result = parseStoryPatterns(['Button/*', 'Card/*'], []);
    expect(result.fileFilters).toEqual(['Button', 'Card']);
    expect(result.testNamePattern).toBeUndefined();
  });

  test('parses "*/*" with no filters', () => {
    const result = parseStoryPatterns(['*/*'], []);
    expect(result.fileFilters).toEqual([]);
    expect(result.testNamePattern).toBeUndefined();
  });

  test('parses pattern without separator as file filter', () => {
    const result = parseStoryPatterns(['Button'], []);
    expect(result.fileFilters).toEqual(['Button']);
    expect(result.testNamePattern).toBeUndefined();
  });

  test('escapes regex special characters in name patterns', () => {
    const result = parseStoryPatterns(['Button/Primary (outlined)'], []);
    expect(result.testNamePattern!.test('Primary (outlined)')).toBe(true);
    expect(result.testNamePattern!.test('Primary outlined')).toBe(false);
  });

  test('combines name patterns from multiple patterns with OR', () => {
    const result = parseStoryPatterns(['Button/Primary', 'Card/Default'], []);
    expect(result.fileFilters).toEqual(['Button', 'Card']);
    expect(result.testNamePattern!.test('Primary')).toBe(true);
    expect(result.testNamePattern!.test('Default')).toBe(true);
    expect(result.testNamePattern!.test('Secondary')).toBe(false);
  });

  test('name pattern with wildcard matches partially', () => {
    const result = parseStoryPatterns(['Button/Primary*'], []);
    expect(result.testNamePattern!.test('Primary')).toBe(true);
    expect(result.testNamePattern!.test('PrimaryLarge')).toBe(true);
    expect(result.testNamePattern!.test('Secondary')).toBe(false);
  });

  test('excludes name patterns via negative lookahead', () => {
    const result = parseStoryPatterns([], ['Button/Disabled']);
    expect(result.fileFilters).toEqual([]);
    expect(result.testNamePattern!.test('Primary')).toBe(true);
    expect(result.testNamePattern!.test('Disabled')).toBe(false);
  });

  test('combines include and exclude name patterns', () => {
    const result = parseStoryPatterns(
      ['Button/Primary', 'Button/Disabled'],
      ['Button/Disabled'],
    );
    expect(result.testNamePattern!.test('Primary')).toBe(true);
    expect(result.testNamePattern!.test('Disabled')).toBe(false);
  });

  test('exclude with wildcard excludes matching names', () => {
    const result = parseStoryPatterns([], ['Button/Dis*']);
    expect(result.testNamePattern!.test('Primary')).toBe(true);
    expect(result.testNamePattern!.test('Disabled')).toBe(false);
    expect(result.testNamePattern!.test('DisabledLarge')).toBe(false);
    expect(result.testNamePattern!.test('Display')).toBe(false);
  });

  test('exclude all names from a title has no name pattern effect', () => {
    const result = parseStoryPatterns(['Card/*'], ['Button/*']);
    expect(result.fileFilters).toEqual(['Card']);
    expect(result.testNamePattern).toBeUndefined();
  });
});
