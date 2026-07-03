# cv-server Specification

## Purpose

Local Node.js HTTP server (stdlib, zero npm) that serves static assets and exposes `POST /api/save` for direct filesystem writes. Solves Chrome's `file://` fetch blocking.

## Requirements

### Requirement: Static file serving

The server MUST serve files from the project root directory on `localhost:3000`.

The server MUST set correct MIME types for `.html` (text/html), `.css` (text/css), `.js` (text/javascript), `.json` (application/json).

The server MUST return `200` for existing files and `404` with a plain text body for missing paths.

#### Scenario: Serves index.html on root request

- GIVEN the server is running on `localhost:3000`
- WHEN a browser requests `GET /`
- THEN the server responds `200` with `Content-Type: text/html`
- AND the body contains the contents of `index.html`

#### Scenario: Returns 404 for missing file

- GIVEN the server is running on `localhost:3000`
- WHEN a browser requests `GET /nonexistent.js`
- THEN the server responds `404` with a plain text error message

### Requirement: POST /api/save endpoint

The server MUST accept `POST /api/save` with a JSON body containing `{ filePath: string, data: object }`.

The server MUST validate that `filePath` is within `data/` to prevent directory traversal.

The server MUST create intermediate directories if they do not exist.

The server MUST write the JSON payload with 2-space indentation.

The server MUST respond `200` with `{ "ok": true }` on success, and `500` with `{ "ok": false, "error": "..." }` on failure.

#### Scenario: Saves version file to data/versions/

- GIVEN the server is running on `localhost:3000`
- WHEN a client sends `POST /api/save` with body `{ "filePath": "data/versions/my-cv.json", "data": { "id": "my-cv" } }`
- THEN the server creates `data/versions/my-cv.json` with the payload
- AND responds `200` with `{ "ok": true }`

#### Scenario: Rejects filePath outside data/

- GIVEN the server is running on `localhost:3000`
- WHEN a client sends `POST /api/save` with body `{ "filePath": "../etc/passwd", "data": {} }`
- THEN the server responds `500` with an error message indicating invalid path

### Requirement: Port and host configuration

The server SHOULD accept `PORT` environment variable (default `3000`).

The server MUST listen on `0.0.0.0` so it is accessible from network hosts.

#### Scenario: Uses default port 3000

- GIVEN no `PORT` environment variable is set
- WHEN the server starts
- THEN it listens on port `3000`

#### Scenario: Uses PORT env variable

- GIVEN `PORT=8080` is set in the environment
- WHEN the server starts
- THEN it listens on port `8080`

## Acceptance Criteria

- [ ] `node serve.js` starts server on localhost:3000 without errors
- [ ] `curl http://localhost:3000/index.html` returns file contents with correct MIME type
- [ ] `curl -X POST -H "Content-Type: application/json" -d '{"filePath":"data/versions/test.json","data":{"id":"test"}}' http://localhost:3000/api/save` creates the file and returns `{"ok":true}`
- [ ] `curl http://localhost:3000/nonexistent` returns 404
- [ ] Path traversal attempts return 500 with error
