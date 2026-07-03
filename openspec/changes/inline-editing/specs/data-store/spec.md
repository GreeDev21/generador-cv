# data-store Specification (Inline Editing Additions)

## Purpose

Extend `GreedevCV.DataStore` with the methods needed to support inline section editing: a public unique-ID generator (`generateId()`) and a base-pool persister (`saveBase()`). These additions allow the Editor to create items in the base pool and persist them to disk without touching the version-config save path.

## Requirements

### Requirement: Expose `generateId()` on DataStore

`GreedevCV.DataStore` MUST expose a `generateId()` method that returns a unique string identifier suitable for new base-pool items (experiences, education entries, projects, and skill categories).

`generateId()` MUST use `crypto.randomUUID()` when available, falling back to `Date.now() + '-' + Math.random().toString(36).slice(2)`.

The method is already defined as a private function inside the DataStore IIFE. It MUST be included in the public export object.

#### Scenario: Generates a UUID via crypto

- GIVEN the browser supports `crypto.randomUUID()`
- WHEN `GreedevCV.DataStore.generateId()` is called
- THEN the return value matches the UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

#### Scenario: Falls back to timestamp-based ID

- GIVEN `crypto.randomUUID` is undefined
- WHEN `GreedevCV.DataStore.generateId()` is called
- THEN the return value matches the format `<timestamp>-<random>` where the second segment is non-empty

#### Scenario: Returns unique values on successive calls

- GIVEN any browser environment
- WHEN `generateId()` is called twice in succession
- THEN the two return values MUST differ

### Requirement: Add `saveBase()` method

`GreedevCV.DataStore` MUST expose a `saveBase()` async method that persists the current base pool (`state.base`) to the server via `POST /api/save`.

The method MUST send a payload with:
- `path`: `"data/cv.json"`
- `content`: the current `state.base` object

On success, `saveBase()` MUST emit a `GreedevCV:saved` event with `{ source: 'server' }`.

If the server is unreachable or returns an error, `saveBase()` MUST fall back to a Blob download of the base pool JSON, and emit `GreedevCV:saved` with `{ source: 'local' }`.

The method MUST return a boolean: `true` if saved to the server, `false` if fallback was used.

The method MUST guard against a null/undefined `state.base` and return `false` without making a request.

#### Scenario: Saves base pool to server

- GIVEN `state.base` contains the full CV pool
- AND the server is running
- WHEN `GreedevCV.DataStore.saveBase()` is called
- THEN a `POST /api/save` request is made with `{ path: 'data/cv.json', content: <base pool> }`
- AND `GreedevCV:saved` is emitted with `{ source: 'server' }`
- AND `true` is returned

#### Scenario: Falls back to Blob download when server is unreachable

- GIVEN `state.base` contains the full CV pool
- AND the server is NOT running
- WHEN `GreedevCV.DataStore.saveBase()` is called
- THEN a `POST /api/save` request fails (or throws)
- AND a Blob download of the base pool JSON is triggered
- AND `GreedevCV:saved` is emitted with `{ source: 'local' }`
- AND `false` is returned

#### Scenario: Guards against missing base state

- GIVEN `state.base` is `null`
- WHEN `GreedevCV.DataStore.saveBase()` is called
- THEN no HTTP request is made
- AND `false` is returned

### Requirement: `saveBase()` MUST NOT replace `save()`

The existing `save()` method (which persists the active version config to `data/versions/{id}.json`) MUST remain unchanged. `saveBase()` is an additive method targeting a different file path.

Both methods MAY share an internal helper for the HTTP POST + fallback logic to avoid duplication, as long as the shared helper respects the different payload path and content source.

## Acceptance Criteria

- [ ] `GreedevCV.DataStore.generateId()` returns a string; two calls never return the same value
- [ ] `GreedevCV.DataStore.saveBase()` POSTs to `/api/save` with path `data/cv.json`
- [ ] `saveBase()` falls back to Blob download when server is unavailable
- [ ] `saveBase()` guards against null base state
- [ ] Existing `save()` method continues to work unchanged
- [ ] In-memory state is consistent after `saveBase()` — no stale data
