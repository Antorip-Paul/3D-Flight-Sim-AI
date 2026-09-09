# Falcon 9 · Flight Control

Interactive HTML, CSS and JavaScript flight simulator. The complete application lives in `public/flight.html`, `public/flight.css`, `public/flight.js` and `public/physics.js`. Three.js is vendored locally with its MIT license. The Sites wrapper serves it at the root.

Run `npm install`, then `npm run dev`. Open the printed local address. Run `node verify-physics.mjs`, `node verify-world.mjs`, `node verify-interface.mjs` and `node verify-scene.mjs` for deterministic flight validation and `npm run build` for production.

Launch starts a uniform time-compressed mission (120 seconds by default). Configure playback, sound, explanation cards and rendering quality before launching. Drag to orbit, scroll to zoom, switch cameras, pause/resume or reset at any time. Hidden tabs automatically pause. WebGL is required; sound effects and countdown tones are generated locally through Web Audio. There is no speech synthesis.

## Model

0.05-second fixed-step integration of two-dimensional motion in SI units. Gravity varies with altitude, atmospheric density falls exponentially, aerodynamic drag opposes velocity, mass falls according to thrust / (specific impulse × standard gravity). Stage separation removes upper-stage mass. Return and entry burns precede closed-loop single-engine landing guidance.

The computed trajectory lasts about 417 seconds, with a vertical ascent until 15 seconds and at least 180 metres of clearance, followed by a smooth pitch program. The booster lands below 1 m/s with remaining propellant. Vehicle geometry approximates Falcon 9's 70 m height and 3.7 m core diameter, nine engine bells, interstage, fairing, four grid fins and four deployable legs. Launch site geometry is illustrative. Vehicle dimensions, altitude and terrain share a metre scale. The ground uses a 6,371 km Earth radius and a floating local coordinate frame; it appears flat close to the surface and curved from high altitude. A logarithmically spaced ground mesh retains local precision. The landing pad follows the same spherical ground coordinates and its top is flush with the surface. Tower umbilical arms touch the vehicle at rest and retract before liftoff. Upper-stage motion after separation is illustrative, not an independently integrated orbital trajectory. Landing pad is placed at the predicted booster endpoint; this is vertical velocity guidance, not geographic target guidance. Engine, mass and aerodynamic parameters are approximate; this is educational and is not engineering-certified SpaceX software.

Reference: https://new.spacex.com/vehicles/falcon-9

Core physics and build checks are automated. Browser visual/audio QA has not been performed.

