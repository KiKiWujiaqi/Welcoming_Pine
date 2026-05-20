# Welcoming Pine

`Welcoming_Pine` is an exhibition interaction project centered on a horizontally scrolling pine-tree composition. Visitors compose a visual narrative on the right side of the screen, and the left side renders the generated scene for capture/export.

## Current Status

The repository currently contains a static front-end prototype:

- `son.html`: main interaction page
- `son.css`: layout and visual styling
- `static/`: source image assets used by the composition

Current behavior:

- visitors toggle text-linked image groups
- branch thickness can be adjusted
- a randomized pixelation effect can be applied
- text fragments can be reshuffled
- image positions can be randomized
- the final composition can be exported as a local image using `html2canvas`

There is no backend yet. Image saving is currently browser download only.

## Running Locally

This version can be opened directly in a browser as a static page:

1. Open `son.html` in a browser, or
2. Serve the folder with any lightweight local static server

Because the export uses `html2canvas` from a CDN, network access may be required unless that dependency is vendored locally later.

## Repository Notes

- This repository is currently on `main` and matches `origin/main` at the time of this README update.
- OS metadata files such as `.DS_Store` and `Thumbs.db` are ignored and should not be committed.
- The `static/` folder is kept in the repository structure, but image ignore rules already exist in `.gitignore`. Confirm the intended asset-tracking policy before changing image management again.

## Planned Next Step

The next implementation phase is to replace local download with a share flow suitable for exhibition use:

1. generate the final composition in the browser
2. send the generated image to a backend service
3. upload the image from the backend to Alibaba Cloud OSS
4. return a public URL
5. show that URL as a QR code for the visitor to scan on their phone

Recommended architecture for this phase:

- front end: existing static interaction page
- backend: Node.js + Express
- storage: Alibaba Cloud OSS

## Operational Recommendation

For exhibition deployment, keep a fallback path for local download even after OSS upload is added. If the network or OSS path fails on site, the installation should still be able to export images locally.
