# Documentation for TheFileTree

All files have *data* and JSON *metadata* (which includes at least two
fields, `{"type", "updated"}`.

You can see the raw file data with
`https://thefiletree.com/path/to/file?app=data`, and the raw file metadata
with `?app=metadata` (or the edit-friendly app `?app=meta`).

File types are either `folder`, `link`, `text`, or a MIME type.

Users are either anonymous or authenticated with their username. They have
four possible access to any given file:
- disallowed (`-`): they don’t see it and cannot read it,
- reader (`r`): they can read it, but cannot edit anything,
- writer (`w`): they can read and edit it,
- owner (`x`): they can also read and edit its metadata.

Dissallowed users will not see any metadata for the file. Non-owners may
only see the file’s `type` and `updated` fields.

Owners can set the access for a subtree by setting the folder’s metadata:

```js
{
  "acl": {
    "espadrine": "r",
    "*": "-"
  }
}
```

… would let the user called `espadrine` read the folder, but everyone else
has no access (unless specified by an ancestor).

## HTTP API

- Create
  - file: `PUT /` (content is body)
  - folder: `MKCOL /`
- Read
  - `GET /` (show in default browser app)
  - `GET /?app=data` (raw, optional header `Depth:3` for folder; TODO slice)
  - `GET /?app=metadata Content-Type:multipart/form-data` (JSON)
- Update
  - single file:
    - data:
      - overwrite: `PUT /`
      - TODO append: `POST /?op=append`
      - TODO partial: `PATCH /`
      - sync: websocket `/?op=edit&app=text` (TODO json, dir)
    - metadata: `PUT /?app=metadata Content-Type:application/json` (TODO: `PATCH /`)
  - multiple files: `POST /?op=append&content Content-Type:multipart/form-data`
  - folder:
    - TODO copy: `COPY /from Destination:/to Overwrite:T`
    - TODO move: `MOVE /from Destination:/to Overwrite:F`
    - TODO shell: `POST /?op=shell&cmd=make&keep=a.out` (stdin is body, stdout is result, unless websocket)
- Delete: `DELETE /`

## Apps

An app is a folder within TheFileTree that contains a `page.html` which will
be loaded when a file is open with that app.

A file opens with a given app if:
1. it is loaded from a URL with `?app=/path/to/app` as a query parameter.
2. it has an `app` metadata field, eg. `{"app": "/path/to/app"}`.
3. an ancestor folder has a metadata field mapping the file’s type to a
   given app, eg. `{"apps": {"audio/opus": "/path/to/app"}}` (or
   `{"apps": {"audio": "/path/to/app"}}`) if the file’s metadata is
   `{"type": "audio/opus"}`.

If the specified app does not start with `/` (eg. `text`), it is assumed to
be prefixed by `/app/` (eg. `/app/text`).

The `page.html` file in the app folder is a template, which receives a few
parameters when loading a file:
- `path`: a string of the file’s path
- `permission`: the level of ownership (`-`, `r`, `w`, `x`)
- `metadata`: a JS object of the metadata
- `appAuthHeader`: a string to put in an `APP_AUTH` header if you send HTTP
  requests to fetch information from thefiletree.com as the current user.
- `params`: an object containing information requested by the app. For
  instance, if the app folder’s metadata includes
  `{"params": {"data", "metadata", "/github/secret"}}`, the `params` key may
  contain `{"data": file data, "metadata": {file metadata},
  "/github/secret": secret}`, where the GitHub secret would be looked up
  first on the file’s metadata under `{"github": {"secret": secret}}`, then
  on the user’s main folder’s metadata.

As described above, when a user installs an app, the app can request access
to user information by adding a `params` object on the app
folder’s metadata:
- `data`: get read and write access to all the data that the user can access.
- `metadata`: get read and write access to all metadata that the user can see and update as
  owner.
- `/path/in/metadata`: get read access to a subset of a file’s metadata (or
  of the user directory’s metadata) from a JSON Pointer.
