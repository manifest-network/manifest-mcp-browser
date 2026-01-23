import { describe, it, expect } from 'vitest';
import { parseAmount, parseBigInt } from './utils.js';
import { ManifestMCPError, ManifestMCPErrorCode } from '../types.js';

describe('parseAmount', () => {
  it('should parse valid amount strings', () => {
    expect(parseAmount('1000umfx')).toEqual({ amount: '1000', denom: 'umfx' });
    expect(parseAmount('1uatom')).toEqual({ amount: '1', denom: 'uatom' });
    expect(parseAmount('999999999token')).toEqual({ amount: '999999999', denom: 'token' });
  });

  it('should handle denominations with numbers', () => {
    expect(parseAmount('100ibc123')).toEqual({ amount: '100', denom: 'ibc123' });
  });

  it('should throw ManifestMCPError for invalid format', () => {
    expect(() => parseAmount('')).toThrow(ManifestMCPError);
    expect(() => parseAmount('umfx')).toThrow(ManifestMCPError);
    expect(() => parseAmount('1000')).toThrow(ManifestMCPError);
    expect(() => parseAmount('abc123')).toThrow(ManifestMCPError);
    expect(() => parseAmount('1000 umfx')).toThrow(ManifestMCPError);
  });

  it('should have correct error code for invalid format', () => {
    try {
      parseAmount('invalid');
    } catch (error) {
      expect(error).toBeInstanceOf(ManifestMCPError);
      expect((error as ManifestMCPError).code).toBe(ManifestMCPErrorCode.TX_FAILED);
    }
  });
});

describe('parseBigInt', () => {
  it('should parse valid integer strings', () => {
    expect(parseBigInt('0', 'test')).toBe(BigInt(0));
    expect(parseBigInt('123', 'test')).toBe(BigInt(123));
    expect(parseBigInt('9999999999999999999', 'test')).toBe(BigInt('9999999999999999999'));
  });

  it('should throw ManifestMCPError for invalid integers', () => {
    expect(() => parseBigInt('abc', 'field')).toThrow(ManifestMCPError);
    expect(() => parseBigInt('12.34', 'field')).toThrow(ManifestMCPError);
    expect(() => parseBigInt('1e10', 'field')).toThrow(ManifestMCPError);
  });

  it('should treat empty string as zero', () => {
    // BigInt('') returns 0n in JavaScript
    expect(parseBigInt('', 'field')).toBe(BigInt(0));
  });

  it('should include field name in error message', () => {
    try {
      parseBigInt('invalid', 'proposal-id');
    } catch (error) {
      expect(error).toBeInstanceOf(ManifestMCPError);
      expect((error as ManifestMCPError).message).toContain('proposal-id');
    }
  });
});
