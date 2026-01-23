import { describe, it, expect } from 'vitest';
import { parseBigInt, parseInt } from './utils.js';
import { ManifestMCPError, ManifestMCPErrorCode } from '../types.js';

describe('parseBigInt', () => {
  it('should parse valid integer strings', () => {
    expect(parseBigInt('0', 'height')).toBe(BigInt(0));
    expect(parseBigInt('123', 'height')).toBe(BigInt(123));
    expect(parseBigInt('9999999999999999999', 'height')).toBe(BigInt('9999999999999999999'));
  });

  it('should throw ManifestMCPError for invalid integers', () => {
    expect(() => parseBigInt('abc', 'height')).toThrow(ManifestMCPError);
    expect(() => parseBigInt('12.34', 'height')).toThrow(ManifestMCPError);
  });

  it('should treat empty string as zero', () => {
    // BigInt('') returns 0n in JavaScript
    expect(parseBigInt('', 'height')).toBe(BigInt(0));
  });

  it('should have correct error code', () => {
    try {
      parseBigInt('invalid', 'height');
    } catch (error) {
      expect(error).toBeInstanceOf(ManifestMCPError);
      expect((error as ManifestMCPError).code).toBe(ManifestMCPErrorCode.QUERY_FAILED);
    }
  });

  it('should include field name in error message', () => {
    try {
      parseBigInt('invalid', 'block-height');
    } catch (error) {
      expect((error as ManifestMCPError).message).toContain('block-height');
    }
  });
});

describe('parseInt', () => {
  it('should parse valid integer strings', () => {
    expect(parseInt('0', 'status')).toBe(0);
    expect(parseInt('123', 'status')).toBe(123);
    expect(parseInt('-5', 'status')).toBe(-5);
  });

  it('should throw ManifestMCPError for invalid integers', () => {
    expect(() => parseInt('', 'status')).toThrow(ManifestMCPError);
    expect(() => parseInt('abc', 'status')).toThrow(ManifestMCPError);
  });

  it('should have correct error code', () => {
    try {
      parseInt('invalid', 'status');
    } catch (error) {
      expect(error).toBeInstanceOf(ManifestMCPError);
      expect((error as ManifestMCPError).code).toBe(ManifestMCPErrorCode.QUERY_FAILED);
    }
  });
});
