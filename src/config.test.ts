import { describe, it, expect } from 'vitest';
import { createConfig, validateConfig, createValidatedConfig, parseGasPrice } from './config.js';
import { ManifestMCPError, ManifestMCPErrorCode } from './types.js';

describe('createConfig', () => {
  it('should apply default values', () => {
    const config = createConfig({
      chainId: 'test-chain',
      rpcUrl: 'https://example.com',
      gasPrice: '1.0umfx',
    });

    expect(config.chainId).toBe('test-chain');
    expect(config.rpcUrl).toBe('https://example.com');
    expect(config.gasPrice).toBe('1.0umfx');
    expect(config.gasAdjustment).toBe(1.3);
    expect(config.addressPrefix).toBe('manifest');
  });

  it('should preserve provided optional values', () => {
    const config = createConfig({
      chainId: 'test-chain',
      rpcUrl: 'https://example.com',
      gasPrice: '1.0umfx',
      gasAdjustment: 2.0,
      addressPrefix: 'custom',
    });

    expect(config.gasAdjustment).toBe(2.0);
    expect(config.addressPrefix).toBe('custom');
  });
});

describe('validateConfig', () => {
  it('should return valid for correct config', () => {
    const result = validateConfig({
      chainId: 'manifest-testnet',
      rpcUrl: 'https://rpc.example.com',
      gasPrice: '1.0umfx',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing required fields', () => {
    const result = validateConfig({});

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('chainId is required');
    expect(result.errors).toContain('rpcUrl is required');
    expect(result.errors).toContain('gasPrice is required');
  });

  it('should validate chainId format', () => {
    const result = validateConfig({
      chainId: '-invalid',
      rpcUrl: 'https://example.com',
      gasPrice: '1.0umfx',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('chainId'))).toBe(true);
  });

  it('should validate rpcUrl format', () => {
    const result = validateConfig({
      chainId: 'test',
      rpcUrl: 'not-a-url',
      gasPrice: '1.0umfx',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('rpcUrl'))).toBe(true);
  });

  it('should validate gasPrice format', () => {
    const result = validateConfig({
      chainId: 'test',
      rpcUrl: 'https://example.com',
      gasPrice: 'invalid',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('gasPrice'))).toBe(true);
  });

  it('should validate optional gasAdjustment', () => {
    const result = validateConfig({
      chainId: 'test',
      rpcUrl: 'https://example.com',
      gasPrice: '1.0umfx',
      gasAdjustment: -1,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('gasAdjustment'))).toBe(true);
  });

  it('should validate optional addressPrefix', () => {
    const result = validateConfig({
      chainId: 'test',
      rpcUrl: 'https://example.com',
      gasPrice: '1.0umfx',
      addressPrefix: 'INVALID',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('addressPrefix'))).toBe(true);
  });
});

describe('createValidatedConfig', () => {
  it('should return config for valid input', () => {
    const config = createValidatedConfig({
      chainId: 'test-chain',
      rpcUrl: 'https://example.com',
      gasPrice: '1.0umfx',
    });

    expect(config.chainId).toBe('test-chain');
  });

  it('should throw ManifestMCPError for invalid input', () => {
    expect(() => createValidatedConfig({
      chainId: '',
      rpcUrl: '',
      gasPrice: '',
    })).toThrow(ManifestMCPError);
  });

  it('should have INVALID_CONFIG error code', () => {
    try {
      createValidatedConfig({
        chainId: '',
        rpcUrl: '',
        gasPrice: '',
      });
    } catch (error) {
      expect((error as ManifestMCPError).code).toBe(ManifestMCPErrorCode.INVALID_CONFIG);
    }
  });
});

describe('parseGasPrice', () => {
  it('should parse valid gas price strings', () => {
    expect(parseGasPrice('1.0umfx')).toEqual({ amount: '1.0', denom: 'umfx' });
    expect(parseGasPrice('0.025uatom')).toEqual({ amount: '0.025', denom: 'uatom' });
    expect(parseGasPrice('100token')).toEqual({ amount: '100', denom: 'token' });
  });

  it('should throw ManifestMCPError for invalid format', () => {
    expect(() => parseGasPrice('invalid')).toThrow(ManifestMCPError);
    expect(() => parseGasPrice('')).toThrow(ManifestMCPError);
  });
});
