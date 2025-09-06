/**
 * Basic functionality tests
 */

describe('Basic Tests', () => {
  test('should pass basic math', () => {
    expect(2 + 2).toBe(4);
  });

  test('should handle strings', () => {
    expect('hello').toContain('ell');
  });

  test('should handle arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  test('should handle objects', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('test');
  });
});
