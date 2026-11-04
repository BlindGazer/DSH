# 1.5 Assertions

Use strict, precise assertions that verify exact behavior. Loose assertions can pass even when code is wrong.

## Equality Assertions

Prefer `toEqual` over `toBe` for objects and arrays. Use `toStrictEqual` when you need to verify undefined properties.

**✅ Correct: toEqual for objects**
```ts
test('should return user object with correct properties', () => {
  const user = createUser({ name: 'John', email: 'john@example.com' });

  expect(user).toEqual({
    name: 'John',
    email: 'john@example.com',
    id: expect.any(String),
    createdAt: expect.any(Date),
  });
});
```

**❌ Incorrect: toBe for objects**
```ts
test('should return user object', () => {
  const user = createUser({ name: 'John' });
  expect(user).toBe({ name: 'John' }); // Always fails - different references!
});
```
*Why?* `toBe` uses `Object.is()` reference equality. For objects/arrays, use `toEqual`.

## toEqual vs toStrictEqual

Use `toStrictEqual` when you need to verify that undefined properties don't exist.

**✅ Correct: toStrictEqual catches undefined properties**
```ts
test('should not include undefined properties', () => {
  const user = { name: 'John', email: 'john@example.com' };

  expect(user).toStrictEqual({ name: 'John', email: 'john@example.com' });
});
```

**⚠️ Potential issue: toEqual ignores undefined**
```ts
test('may not catch unexpected undefined', () => {
  const user = { name: 'John', email: undefined };

  // This passes with toEqual!
  expect(user).toEqual({ name: 'John' });

  // This fails with toStrictEqual (better)
  expect(user).toStrictEqual({ name: 'John' }); // Fails - email is undefined
});
```

## Primitives: toBe vs toEqual

For primitives (numbers, strings, booleans), both work, but `toBe` is more semantically correct.

**✅ Correct: toBe for primitives**
```ts
expect(count).toBe(5);
expect(name).toBe('John');
expect(isValid).toBe(true);
```

**✅ Also correct but less semantic: toEqual for primitives**
```ts
expect(count).toEqual(5); // Works but toBe is clearer for primitives
```

## Avoid Loose Assertions

Don't use fuzzy matchers when you can be precise.

**❌ Incorrect: loose assertion**
```ts
test('should return user data', () => {
  const result = fetchUser('123');
  expect(result).toContain('john'); // Too vague!
});
```

**✅ Correct: precise assertion**
```ts
test('should return user with email', () => {
  const result = fetchUser('123');
  expect(result).toEqual({
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
  });
});
```

## Array Assertions

Use specific array matchers for clarity.

**✅ Correct: specific array matchers**
```ts
describe('filterActiveUsers', () => {
  test('should return array of active users only', () => {
    const users = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
      { id: 3, name: 'Charlie', active: true },
    ];

    const result = filterActiveUsers(users);

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { id: 1, name: 'Alice', active: true },
      { id: 3, name: 'Charlie', active: true },
    ]);
  });

  test('should contain specific user', () => {
    const result = getAllUsers();
    expect(result).toContainEqual({ id: 1, name: 'Alice', active: true });
  });

  test('should return empty array when no active users', () => {
    const users = [{ id: 1, name: 'Bob', active: false }];
    expect(filterActiveUsers(users)).toEqual([]);
  });
});
```

**❌ Incorrect: imprecise array checks**
```ts
test('should return users', () => {
  const result = filterActiveUsers(users);
  expect(result.length).toBeGreaterThan(0); // How many? Which users?
});
```

## String Assertions

Use appropriate string matchers based on what you're testing.

**✅ Correct: precise string assertions**
```ts
describe('formatName', () => {
  test('should return full name', () => {
    expect(formatName('john', 'doe')).toBe('John Doe');
  });

  test('should include title when provided', () => {
    const result = formatName('john', 'doe', 'Dr.');
    expect(result).toBe('Dr. John Doe');
  });

  test('should match name pattern', () => {
    const result = formatName('john', 'doe');
    expect(result).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  test('should contain first name', () => {
    const result = formatName('john', 'doe');
    expect(result).toContain('John');
  });
});
```

**❌ Incorrect: overly loose string checks**
```ts
test('should format name', () => {
  const result = formatName('john', 'doe');
  expect(result).toBeTruthy(); // Way too vague!
  expect(result.length).toBeGreaterThan(0); // Still vague!
});
```

## Number Assertions

Use comparison matchers for numeric ranges and boundaries.

**✅ Correct: numeric matchers**
```ts
describe('calculateDiscount', () => {
  test('should return positive discount', () => {
    const discount = calculateDiscount(100, 0.1);
    expect(discount).toBeGreaterThan(0);
    expect(discount).toBeLessThanOrEqual(100);
  });

  test('should return exact discount amount', () => {
    expect(calculateDiscount(100, 0.1)).toBe(10);
  });

  test('should handle floating point comparison', () => {
    const result = calculateTax(99.99, 0.0825);
    expect(result).toBeCloseTo(8.25, 2); // Within 2 decimal places
  });
});
```

## Boolean and Nullish Assertions

Be explicit about boolean, null, and undefined checks.

**✅ Correct: explicit boolean checks**
```ts
describe('isValidEmail', () => {
  test('should return true for valid email', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });

  test('should return false for invalid email', () => {
    expect(isValidEmail('invalid')).toBe(false);
  });
});

describe('findUser', () => {
  test('should return null when user not found', () => {
    expect(findUser('invalid-id')).toBeNull();
  });

  test('should return undefined for missing optional field', () => {
    const user = createUser({ name: 'John' });
    expect(user.middleName).toBeUndefined();
  });

  test('should have defined email', () => {
    const user = createUser({ name: 'John', email: 'john@example.com' });
    expect(user.email).toBeDefined();
  });
});
```

**❌ Incorrect: loose truthy/falsy checks**
```ts
test('should validate email', () => {
  expect(isValidEmail('test@example.com')).toBeTruthy(); // Could be any truthy value!
});

test('should not find user', () => {
  expect(findUser('invalid')).toBeFalsy(); // Could be false, null, undefined, 0, etc.
});
```
*Why?* `toBeTruthy`/`toBeFalsy` are too permissive. Be explicit about the expected value.

## Object Property Assertions

Use matchers that verify object structure and properties.

**✅ Correct: object property matchers**
```ts
describe('createUser', () => {
  test('should have required properties', () => {
    const user = createUser({ name: 'John', email: 'john@example.com' });

    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name', 'John');
    expect(user).toHaveProperty('email', 'john@example.com');
    expect(user).toHaveProperty('createdAt');
  });

  test('should match expected shape', () => {
    const user = createUser({ name: 'John', email: 'john@example.com' });

    expect(user).toMatchObject({
      name: 'John',
      email: 'john@example.com',
    });
    // toMatchObject allows extra properties like id, createdAt
  });
});
```

## Type Assertions

Verify types when type checking is important.

**✅ Correct: type assertions**
```ts
describe('parseData', () => {
  test('should return correct types', () => {
    const result = parseData('{"count": 5}');

    expect(result.count).toEqual(expect.any(Number));
    expect(result.timestamp).toEqual(expect.any(Date));
    expect(result.tags).toEqual(expect.any(Array));
  });

  test('should return string array', () => {
    const tags = getTags();

    expect(tags).toEqual(expect.arrayContaining([expect.any(String)]));
  });
});
```

## Asymmetric Matchers

Use asymmetric matchers when exact values aren't known but structure is.

**✅ Correct: asymmetric matchers for dynamic values**
```ts
describe('createOrder', () => {
  test('should create order with generated ID', () => {
    const order = createOrder({ items: [{ id: 1, quantity: 2 }] });

    expect(order).toEqual({
      id: expect.stringMatching(/^order-[a-f0-9]+$/),
      items: expect.arrayContaining([
        expect.objectContaining({ id: 1, quantity: 2 }),
      ]),
      createdAt: expect.any(Date),
      status: 'pending',
    });
  });
});
```

## Negation

Use `.not` to assert something is NOT true, but be specific.

**✅ Correct: specific negation**
```ts
test('should not include deleted users', () => {
  const users = getActiveUsers();

  expect(users).not.toContainEqual(
    expect.objectContaining({ status: 'deleted' })
  );
});

test('should not be empty string', () => {
  const username = generateUsername();
  expect(username).not.toBe('');
  expect(username.length).toBeGreaterThan(0);
});
```

**❌ Incorrect: vague negation**
```ts
test('should not be wrong', () => {
  expect(result).not.toBeFalsy(); // What IS it then?
});
```

## Custom Error Messages

Add custom messages to clarify assertion failures.

**✅ Correct: custom error messages for complex assertions**
```ts
test('should process all items', () => {
  const result = processItems(items);

  expect(
    result.every(item => item.processed === true),
    'All items should have processed=true'
  ).toBe(true);
});
```

## Common Assertion Anti-Patterns

**❌ Incorrect: no assertion**
```ts
test('should create user', () => {
  createUser({ name: 'John' });
  // No assertion! Test always passes!
});
```

**❌ Incorrect: asserting implementation details**
```ts
test('should call internal helper', () => {
  const spy = vi.spyOn(service, '_internalHelper');
  service.publicMethod();
  expect(spy).toHaveBeenCalled(); // Testing internal implementation
});
```
*Why?* Test behavior, not implementation. Internal helpers can change without breaking public API.

**❌ Incorrect: multiple unrelated assertions**
```ts
test('should work', () => {
  const user = createUser({ name: 'John' });
  expect(user.name).toBe('John');

  const product = createProduct({ name: 'Widget' });
  expect(product.name).toBe('Widget'); // Different concern - split into separate test
});
```
