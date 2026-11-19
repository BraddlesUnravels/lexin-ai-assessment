# UI conditional rendering rules

Use clear, simple conditions when rendering React components.

## Ternary conditional operator (`? :`)

Use a ternary when choosing between two values or components:

```tsx
{isLoading ? <LoadingSpinner /> : <MaterialTable />}
```

When one branch renders nothing, return `undefined` rather than `null`:

```tsx
{hasError ? <ErrorMessage /> : undefined}
```

## Logical AND (`&&`)

Use `&&` when a component should render only when a condition is true:

```tsx
{hasError && <ErrorMessage />}
```

Make numeric conditions explicitly boolean. React can render `0` if it is the left operand of `&&`:

```tsx
{items.length > 0 && <MaterialTable />}
```

## Logical OR (`||`)

Use `||` when any of several conditions can permit rendering, or when a fallback should apply to any falsy value:

```tsx
{(isAdmin || isManager) && <EditButton />}
{errorMessage || 'Something went wrong'}
```

`||` also treats `0`, an empty string and `false` as missing. When those are valid values and only `null` or `undefined` need a fallback, use nullish coalescing (`??`):

```tsx
{quantity ?? 'Unavailable'}
```

## Readability

Use parentheses to make combined conditions clear. If an expression becomes difficult to follow, extract a clearly named boolean or use an early return.

Do not use long chains of nested ternaries for display logic. They are fragile and difficult to read and maintain. For multiple display states, use clear early returns or extract the logic into a named component or function:

```tsx
if (isLoading) return <LoadingSpinner />;
if (hasError) return <ErrorMessage />;
if (items.length === 0) return <EmptyState />;

return <MaterialTable />;
```
