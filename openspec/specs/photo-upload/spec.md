# Photo Upload Specification

## Purpose

Permitir al usuario subir una foto de perfil para su CV, almacenarla en Vercel Blob, y servirla a través de un endpoint autenticado sin exponer la URL real de Blob.

## Requirements

### Requirement: Photo Upload Endpoint

`POST /api/cv/photo` MUST accept a multipart file, upload it to Vercel Blob via `@vercel/blob`, and store the resulting URL in `personalInfo.photo`.

#### Scenario: upload a valid image

- GIVEN the user selects a PNG/JPG/WEBP file under 2MB
- WHEN `POST /api/cv/photo` is called with the file
- THEN the endpoint returns `200` with `{ url, filename }`
- AND `personalInfo.photo` is updated with the Blob URL

#### Scenario: reject oversized file

- GIVEN the user selects a file larger than 2MB
- WHEN `POST /api/cv/photo` is called
- THEN the endpoint returns `413` with `{ error: "File too large" }`

#### Scenario: reject invalid file type

- GIVEN the user selects a `.gif` or `.pdf` file
- WHEN `POST /api/cv/photo` is called
- THEN the endpoint returns `415` with `{ error: "Unsupported file type" }`

#### Scenario: missing BLOB_READ_WRITE_TOKEN

- GIVEN `BLOB_READ_WRITE_TOKEN` is not set
- WHEN any upload is attempted
- THEN the endpoint returns `500` with `{ error: "Blob storage not configured" }`

#### Scenario: re-upload replaces previous photo

- GIVEN `personalInfo.photo` already has a Blob URL
- WHEN a new valid image is uploaded
- THEN the old Blob is deleted via `@vercel/blob del()`
- AND `personalInfo.photo` is updated with the new Blob URL

### Requirement: Photo Serve Endpoint

`GET /api/cv/photo` MUST authenticate the request, fetch the Blob, and serve the image bytes with the correct Content-Type. It MUST NOT expose the real Blob URL to the client.

#### Scenario: serve authenticated photo

- GIVEN `personalInfo.photo` contains a valid Blob URL
- WHEN `GET /api/cv/photo` is called with valid auth
- THEN the endpoint returns `200` with the image bytes and correct `Content-Type`

#### Scenario: no photo uploaded

- GIVEN `personalInfo.photo` is `undefined`
- WHEN `GET /api/cv/photo` is called
- THEN the endpoint returns `404` with `{ error: "No photo" }`

### Requirement: Editor Photo UI

The editor MUST display a file input and preview image in the Personal Info section. The preview SHALL show the current photo if `personalInfo.photo` exists.

#### Scenario: upload from editor updates preview

- GIVEN the editor shows the Personal Info section without a photo
- WHEN the user selects a valid image via the file input
- THEN a preview of the selected image appears immediately
- AND after upload completes, the preview shows the persisted photo

#### Scenario: replace photo in editor

- GIVEN the editor shows an existing photo preview
- WHEN the user selects a new image via the file input
- THEN the preview updates to the new image
- AND the old photo is no longer visible
