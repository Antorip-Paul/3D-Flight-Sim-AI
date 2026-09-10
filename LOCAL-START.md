# Run Falcon 9 locally

This folder contains the complete project, including the 3D library, HTML, CSS, JavaScript, physics model, local server, source configuration, and tests.

1. Install Node.js 22 or later if it is not already installed.
2. Double-click **START-LOCAL.cmd**.
3. Open **http://127.0.0.1:4173** in your browser.

Keep the server window open while testing. Press Ctrl+C in that window to stop it. No package installation or Sites account is needed for this local mode. All simulation code and Three.js are included. Online fonts are optional; the interface uses system fallbacks if offline.

Alternatively, open a terminal in this folder and run `node local-server.mjs` or `npm run local`.

The editable application is in `public/`. Change `flight.html` for layout, `flight.css` for styling, `flight.js` for the scene and controls, `physics.js` for the flight and rotational model, and `world.js` for terrain and pad dimensions. Refresh the browser after editing.

Run `npm test` for the numerical and scene checks (no dependency installation needed). The scene test uses a mocked renderer; it does not validate browser rendering or audio.

The optional Sites development workflow remains available using `npm ci`, `npm run dev`, and `npm run build`.
