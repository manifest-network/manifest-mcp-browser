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

  it('should handle factory denoms with slashes', () => {
    expect(parseAmount('1000000factory/manifest1abc123/upwr')).toEqual({
      amount: '1000000',
      denom: 'factory/manifest1abc123/upwr',
    });
  });

  it('should handle IBC denoms with slashes', () => {
    expect(parseAmount('500ibc/ABC123DEF456')).toEqual({
      amount: '500',
      denom: 'ibc/ABC123DEF456',
    });
  });

  it('should handle denoms with underscores', () => {
    expect(parseAmount('100my_token')).toEqual({ amount: '100', denom: 'my_token' });
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

  it('should provide helpful hint for empty string', () => {
    try {
      parseAmount('');
    } catch (error) {
      expect((error as ManifestMCPError).message).toContain('Received empty string');
    }
  });

  it('should provide helpful hint for amount with space', () => {
    try {
      parseAmount('1000 umfx');
    } catch (error) {
      expect((error as ManifestMCPError).message).toContain('Remove the space');
    }
  });

  it('should provide helpful hint for amount with comma', () => {
    try {
      parseAmount('1,000umfx');
    } catch (error) {
      expect((error as ManifestMCPError).message).toContain('Do not use commas');
    }
  });

  it('should provide helpful hint for missing denomination', () => {
    try {
      parseAmount('1000');
    } catch (error) {
      expect((error as ManifestMCPError).message).toContain('Missing denomination');
    }
  });

  it('should provide helpful hint for denom-first format', () => {
    try {
      parseAmount('umfx1000');
    } catch (error) {
      expect((error as ManifestMCPError).message).toContain('must start with a number');
    }
  });

  it('should include details with received value and example', () => {
    try {
      parseAmount('bad');
    } catch (error) {
      const details = (error as ManifestMCPError).details;
      expect(details?.receivedValue).toBe('bad');
      expect(details?.example).toBe('1000000umfx');
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

  it('should throw ManifestMCPError for empty string', () => {
    // Empty string should be rejected for security (prevents accidental 0 values)
    expect(() => parseBigInt('', 'field')).toThrow(ManifestMCPError);
    expect(() => parseBigInt('   ', 'field')).toThrow(ManifestMCPError);
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
