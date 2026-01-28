import { describe, it, expect } from 'vitest';
import { toBech32 } from '@cosmjs/encoding';
import { parseAmount, parseBigInt, extractFlag, filterConsumedArgs, parseColonPair, validateAddress, validateMemo, validateArgsLength } from './utils.js';
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

describe('extractFlag', () => {
  it('should extract flag value when present', () => {
    const result = extractFlag(['--memo', 'hello'], '--memo', 'test');
    expect(result.value).toBe('hello');
    expect(result.consumedIndices).toEqual([0, 1]);
  });

  it('should return undefined when flag not present', () => {
    const result = extractFlag(['arg1', 'arg2'], '--memo', 'test');
    expect(result.value).toBeUndefined();
    expect(result.consumedIndices).toEqual([]);
  });

  it('should handle flag in middle of args', () => {
    const result = extractFlag(['arg1', '--memo', 'hello', 'arg2'], '--memo', 'test');
    expect(result.value).toBe('hello');
    expect(result.consumedIndices).toEqual([1, 2]);
  });

  it('should throw when flag has no value', () => {
    expect(() => extractFlag(['--memo'], '--memo', 'test')).toThrow(ManifestMCPError);
  });

  it('should throw when flag value looks like another flag', () => {
    expect(() => extractFlag(['--memo', '--other'], '--memo', 'test')).toThrow(ManifestMCPError);
  });

  it('should include context in error message', () => {
    try {
      extractFlag(['--memo'], '--memo', 'bank send');
    } catch (error) {
      expect((error as ManifestMCPError).message).toContain('bank send');
      expect((error as ManifestMCPError).message).toContain('--memo');
    }
  });
});

describe('filterConsumedArgs', () => {
  it('should filter out consumed indices', () => {
    const result = filterConsumedArgs(['a', 'b', 'c', 'd'], [1, 2]);
    expect(result).toEqual(['a', 'd']);
  });

  it('should return original array when no indices consumed', () => {
    const result = filterConsumedArgs(['a', 'b', 'c'], []);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('should handle all indices consumed', () => {
    const result = filterConsumedArgs(['a', 'b'], [0, 1]);
    expect(result).toEqual([]);
  });

  it('should handle non-contiguous indices', () => {
    const result = filterConsumedArgs(['a', 'b', 'c', 'd', 'e'], [0, 2, 4]);
    expect(result).toEqual(['b', 'd']);
  });
});

describe('parseColonPair', () => {
  it('should parse valid colon-separated pairs', () => {
    expect(parseColonPair('address:amount', 'address', 'amount', 'test')).toEqual(['address', 'amount']);
    expect(parseColonPair('key:value', 'key', 'value', 'test')).toEqual(['key', 'value']);
  });

  it('should handle values with colons (takes first colon as separator)', () => {
    const result = parseColonPair('address:100:extra', 'address', 'amount', 'test');
    expect(result).toEqual(['address', '100:extra']);
  });

  it('should throw for missing colon', () => {
    expect(() => parseColonPair('nodelimiter', 'left', 'right', 'test')).toThrow(ManifestMCPError);
  });

  it('should throw for empty left side', () => {
    expect(() => parseColonPair(':value', 'left', 'right', 'test')).toThrow(ManifestMCPError);
  });

  it('should throw for empty right side', () => {
    expect(() => parseColonPair('key:', 'left', 'right', 'test')).toThrow(ManifestMCPError);
  });

  it('should include context and field names in error messages', () => {
    try {
      parseColonPair('invalid', 'address', 'amount', 'multi-send');
    } catch (error) {
      const message = (error as ManifestMCPError).message;
      expect(message).toContain('multi-send');
      expect(message).toContain('address');
      expect(message).toContain('amount');
    }
  });

  it('should provide specific error for missing left value', () => {
    try {
      parseColonPair(':value', 'address', 'amount', 'test');
    } catch (error) {
      expect((error as ManifestMCPError).message).toContain('Missing address');
    }
  });

  it('should provide specific error for missing right value', () => {
    try {
      parseColonPair('key:', 'address', 'amount', 'test');
    } catch (error) {
      expect((error as ManifestMCPError).message).toContain('Missing amount');
    }
  });
});

describe('validateAddress', () => {
  // Generate valid bech32 addresses programmatically using @cosmjs/encoding
  // 20 bytes is the standard Cosmos address length
  const validManifestAddress = toBech32('manifest', new Uint8Array(20));
  const validCosmosAddress = toBech32('cosmos', new Uint8Array(20));

  it('should accept valid bech32 addresses', () => {
    expect(() => validateAddress(validManifestAddress, 'test')).not.toThrow();
    expect(() => validateAddress(validCosmosAddress, 'test')).not.toThrow();
  });

  it('should throw for empty address', () => {
    expect(() => validateAddress('', 'recipient')).toThrow(ManifestMCPError);
    expect(() => validateAddress('   ', 'recipient')).toThrow(ManifestMCPError);
  });

  it('should throw for invalid bech32 address', () => {
    expect(() => validateAddress('notanaddress', 'recipient')).toThrow(ManifestMCPError);
    expect(() => validateAddress('manifest1invalid', 'recipient')).toThrow(ManifestMCPError);
  });

  it('should use INVALID_ADDRESS error code', () => {
    try {
      validateAddress('invalid', 'recipient');
    } catch (error) {
      expect((error as ManifestMCPError).code).toBe(ManifestMCPErrorCode.INVALID_ADDRESS);
    }
  });

  it('should include field name in error message', () => {
    try {
      validateAddress('invalid', 'validator address');
    } catch (error) {
      expect((error as ManifestMCPError).message).toContain('validator address');
    }
  });

  it('should validate expected prefix when provided', () => {
    // Should pass when prefix matches
    expect(() => validateAddress(validManifestAddress, 'test', 'manifest')).not.toThrow();

    // Should fail when prefix doesn't match
    expect(() => validateAddress(validManifestAddress, 'test', 'cosmos')).toThrow(ManifestMCPError);
  });

  it('should include expected prefix in error message', () => {
    try {
      validateAddress(validManifestAddress, 'recipient', 'cosmos');
    } catch (error) {
      const message = (error as ManifestMCPError).message;
      expect(message).toContain('cosmos');
      expect(message).toContain('manifest');
    }
  });
});

describe('validateMemo', () => {
  it('should accept memo within limit', () => {
    expect(() => validateMemo('')).not.toThrow();
    expect(() => validateMemo('short memo')).not.toThrow();
    expect(() => validateMemo('a'.repeat(256))).not.toThrow();
  });

  it('should throw for memo exceeding 256 characters', () => {
    expect(() => validateMemo('a'.repeat(257))).toThrow(ManifestMCPError);
    expect(() => validateMemo('a'.repeat(500))).toThrow(ManifestMCPError);
  });

  it('should use TX_FAILED error code', () => {
    try {
      validateMemo('a'.repeat(300));
    } catch (error) {
      expect((error as ManifestMCPError).code).toBe(ManifestMCPErrorCode.TX_FAILED);
    }
  });

  it('should include length info in error message', () => {
    try {
      validateMemo('a'.repeat(300));
    } catch (error) {
      const message = (error as ManifestMCPError).message;
      expect(message).toContain('300');
      expect(message).toContain('256');
    }
  });
});

describe('validateArgsLength', () => {
  it('should accept args within limit', () => {
    expect(() => validateArgsLength([], 'test')).not.toThrow();
    expect(() => validateArgsLength(['a', 'b', 'c'], 'test')).not.toThrow();
    expect(() => validateArgsLength(new Array(100).fill('arg'), 'test')).not.toThrow();
  });

  it('should throw for args exceeding 100 items', () => {
    expect(() => validateArgsLength(new Array(101).fill('arg'), 'test')).toThrow(ManifestMCPError);
    expect(() => validateArgsLength(new Array(200).fill('arg'), 'test')).toThrow(ManifestMCPError);
  });

  it('should use TX_FAILED error code', () => {
    try {
      validateArgsLength(new Array(150).fill('arg'), 'test');
    } catch (error) {
      expect((error as ManifestMCPError).code).toBe(ManifestMCPErrorCode.TX_FAILED);
    }
  });

  it('should include context and count in error message', () => {
    try {
      validateArgsLength(new Array(150).fill('arg'), 'bank send');
    } catch (error) {
      const message = (error as ManifestMCPError).message;
      expect(message).toContain('bank send');
      expect(message).toContain('150');
      expect(message).toContain('100');
    }
  });
});
