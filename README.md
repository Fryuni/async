# Nano Stores Async

<img align="right" width="92" height="92" title="Nano Stores logo"
     src="https://nanostores.github.io/nanostores/logo.svg">

Async computed stores for [Nano Stores](https://github.com/nanostores/nanostores).

- **Small.** 418 bytes (minified and brotlied). Zero dependencies.
- Good **TypeScript** support.
- Built-in **state machine** for loading, ready, and failed states.
- **Cascading** async stores with automatic value unwrapping.
- Integrates with Nano Stores [`task`](https://github.com/nanostores/nanostores#tasks)
  for SSR and testing.

```ts
import { computedAsync } from '@nanostores/async'

const $org = computedAsync($orgSlug, slug => {
  return fetchOrgBySlug(slug)
})

const $profile = computedAsync([$org, $userId], (org, userId) => {
  return fetchUserProfile(org.id, userId)
})
```

## Install

```sh
npm install nanostores @nanostores/async
```

## Usage

See [Nano Stores docs](https://github.com/nanostores/nanostores#guide)
about using the store and subscribing to store's changes in UI frameworks.

### Async Computed Stores

`computedAsync` creates a derived store that asynchronously computes
its value from one or more stores. The store value is
an `AsyncValue<T>` object that represents the current state:

```ts
import { atom } from 'nanostores'
import { computedAsync } from '@nanostores/async'

const $userId = atom('user-1')

const $user = computedAsync($userId, userId => {
  return fetchUser(userId)
})
```

The store transitions through the following states:

```ts
// Initial state
{ state: 'loading' }

// After the async callback resolves
{ state: 'ready', changing: false, value: { name: 'John' } }

// When a dependency changes (still holds the previous value)
{ state: 'ready', changing: true, value: { name: 'John' } }

// If the async callback throws
{ state: 'failed', changing: false, error: Error }
```

Subscribe to the store and handle the states:

```ts
$user.subscribe(user => {
  switch (user.state) {
    case 'loading':
      showSpinner()
      break
    case 'ready':
      showProfile(user.value)
      if (user.changing) showRefreshIndicator()
      break
    case 'failed':
      showError(user.error)
      break
  }
})
```

### Multiple Dependencies

Pass an array of stores. The callback receives the values in the same
order:

```ts
const $firstName = atom('John')
const $lastName = atom('Doe')

const $fullName = computedAsync([$firstName, $lastName], (first, last) => {
  return fetchFullName(first, last)
})
```

### Cascading Async Stores

When input stores are themselves async (created by `computedAsync`),
their values are automatically unwrapped. The callback receives
the resolved value directly and is only called when all inputs are
in the `'ready'` state.

```ts
const $org = computedAsync($orgSlug, slug => {
  return fetchOrgBySlug(slug)
})

// `org` is the resolved value, not an AsyncValue wrapper
const $profile = computedAsync([$org, $userId], (org, userId) => {
  return fetchUserProfile(org.id, userId)
})
```

Cascading behavior:

- If any input is `'loading'`, the derived store stays in `'loading'`.
- If any input has `changing: true`, the derived store transitions
  to `changing: true` without recomputing.
- If any input is `'failed'`, the derived store inherits the error
  from the leftmost failed input.

Non-async stores are passed through as-is.

### No Cascade Mode

If you need full control over async input states, use
`computedAsyncNoCascade`. The callback receives the raw `AsyncValue`
wrapper for every input, and is called on every state transition.

```ts
import { computedAsyncNoCascade } from '@nanostores/async'

const $org = computedAsync($orgSlug, slug => {
  return fetchOrgBySlug(slug)
})

const $profile = computedAsyncNoCascade($org, orgValue => {
  if (orgValue.state !== 'ready') return null
  return fetchUserProfile(orgValue.value.id)
})
```

### Error Handling

Errors thrown in the callback (sync or async) are caught and
represented as the `'failed'` state. They never throw into the caller:

```ts
const $data = computedAsync($input, value => {
  if (!value) {
    throw new Error('missing input')
  }
  return fetchData(value)
})

$data.subscribe(data => {
  if (data.state === 'failed') {
    console.error(data.error) // Error: missing input
  }
})
```

### Batching

`computedAsync` is batched automatically. Multiple synchronous changes
to input stores result in a single callback invocation:

```ts
const $a = atom(1)
const $b = atom(2)

const $sum = computedAsync([$a, $b], (a, b) => {
  // Called once, not twice
  return fetchSum(a, b)
})

$a.set(10)
$b.set(20)
// Only one fetch with (10, 20)
```

### Integration with Tasks

All state transitions are tracked with
[`task`](https://github.com/nanostores/nanostores#tasks). You can use
`allTasks()` to wait until all async computed stores have settled, which
is useful for SSR and testing:

```ts
import { allTasks } from 'nanostores'

$orgSlug.set('my-org')

// Both $org and $profile start loading
await allTasks()

// Both have their final ready values
console.log($profile.get())
// { state: 'ready', changing: false, value: { name: 'John' } }
```

## Types

The store value uses the `AsyncValue<T>` type:

```ts
type AsyncValue<T> =
  | { state: 'loading' }
  | { state: 'ready'; changing: boolean; value: T }
  | { state: 'failed'; changing: boolean; error: unknown }
```

The store itself is typed as `AsyncComputedStore<Value>`:

```ts
import type { AsyncComputedStore, AsyncValue } from '@nanostores/async'
```
