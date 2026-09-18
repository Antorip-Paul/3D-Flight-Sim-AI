# Falcon 9 refactor: requirements and acceptance criteria

## Preserved application contract

Keep the existing HTML/CSS/JavaScript application, Sites wrapper, DOM controls, `running`/`paused`/`missionT` state, precomputed flight samples, `buildFlight`/`sampleFlight` entry points, camera modes, settings, audio controls, reset behavior and WebMCP command interface. Extend sample fields for physical quantities; do not introduce another state store or replace the framework. The default 120-second playback uniformly scales the complete mission, including suspension settling.

## 1. Rocket geometry

- **Four radial landing legs:** each leg has an azimuth parent at 45°, 135°, 225° or 315° and a separate deployment hinge. The azimuth parent rotates about Y; the hinge rotates about its local Z. The deployed foot positions must have equal radii and adjacent radial vectors must be perpendicular. A shared Euler rotation must not flatten deployment into one plane.
- **Compression:** each leg's telescoping strut shortens by the integrated suspension compression, projected along the deployed strut. All four feet stay on the concrete as the booster body settles.
- **Exhaust:** sea-level exhaust is narrow; reducing ambient pressure continuously widens the plume in both transverse axes. The exhaust direction follows the integrated gimbal angle. The upper-stage vacuum plume uses its own expansion.
- **RCS:** visible paired gas puffs use the signed cold-gas torque pulse field from the physical model, rather than an unrelated visual timer. Opposite torque signs activate opposite exhaust directions.
- **Landing target:** use a solid concrete LZ-1-inspired disk, raised rim, separate target rings, radial markings and geometric lettering. Its foundation intersects the ground; the visible surface is 0.16 m above grade. This is an illustrative recovery target, not a surveyed replica of SpaceX LZ-1.

## 2. Earth, atmosphere and sunlight

- **Surface:** bundle a 8192×4096 NASA Blue Marble color map, downsampled from NASA’s 21600×10800 original, and a 5400×2700 elevation map. Use spherical geographic UV coordinates in the existing floating-origin Earth frame. Use a georeferenced NASA GIBS Cape Canaveral image within its documented longitude/latitude bounds. Blend to 2K PBR sand and vegetation materials nearby, with normal and roughness maps and decorrelated texture sampling. Fade material detail by both camera altitude and view distance; retain the same coast throughout ascent and return.
- **Elevation and oceans:** use the elevation map as a bump map at regional altitude. Use a separate ocean specular mask so water reflects the directional sun while land stays diffuse. Surface color is sRGB; height, cloud and ocean masks are linear data.
- **Clouds:** render a distinct transparent cloud layer about 6 km above the surface, advect its UV coordinates with mission time, and include a corresponding approximate cloud shadow in the ground material. This is animated cloud imagery, not real-time weather.
- **Atmosphere:** integrate exponentially declining Rayleigh and aerosol density along the camera ray, account for wavelength-dependent extinction and sunlight attenuation, and use Rayleigh/Mie phase functions. The sky uses the camera's actual altitude so the near-ground horizon has no false black band. Scattering becomes weak overhead above 80 km while tangent rays retain a blue limb. A low-altitude ambient term approximates uncomputed multiple scattering.
- **Sunlight:** use one dominant, fixed-direction sunlight source, daylight ambient fill, shadow casting and appropriate roughness/specular response. The shadow camera follows the floating-origin vehicle without changing the solar direction. The interstage and grid fins use dark, reflective materials rather than bright metallic chrome.
- **Assets:** all required maps are served locally, with source and reuse attribution in `public/assets/ATTRIBUTION.txt` and Model notes. A failed texture request must be reported, not silently presented as a complete render.

## 3. Flight dynamics

- **Angular inertia:** after separation, integrate angular velocity and orientation at the same fixed step as translation. Use a mass-dependent cylindrical moment of inertia, signed actuator torque, and `α=τ/I`. Engine cutoff must preserve angular momentum. Cold-gas control uses bounded 80 kN·m torque pulses; atmospheric control grows with dynamic pressure, and engine authority is bounded. These are simulation actuator parameters, not published SpaceX hardware specifications.
- **Thrust direction:** acceleration follows the integrated booster attitude plus a gimbal angle limited to approximately 6°. A return burn waits for suitable attitude alignment. The vehicle smoothly aligns for entry and landing; rendering must not replace its orientation with a hard-coded vertical pose.
- **Touchdown:** enter a contact-integration phase when the legs meet the pad; do not set velocity to zero. Integrate an equivalent four-leg spring/damper with `k=2,000,000 N/m`, `c=1.5√(km)` and unilateral normal force `max(0,k·compression−c·verticalVelocity)`. Use 5 ms contact substeps, horizontal damping and ground attitude damping. Declare completion only after motion settles. Render the resulting compression and retain the final weight-supported deflection. This is an equivalent compliant model, not a claim that real Falcon legs contain coil springs.
- **Atmosphere and drag:** use continuous, piecewise exponential interpolation through standard-atmosphere density and pressure anchors from sea level to 150 km. Calculate `q=½ρv²` from current air-relative speed and density, opposing drag along the velocity vector. Add a smooth transonic drag rise. Pressure also drives thrust interpolation and plume expansion.

## Verification

`npm test` checks reference densities, density continuity/monotonicity, dynamic pressure, inertia/torque integration, engine-cutoff continuity, finite flight samples, propellant use, timing at every playback speed, pad foundations, four-leg symmetry, reset, and DOM/control references. A separate 20 km/h vertical drop test exercises suspension compression and settling independently of the nominal gentle landing. `npm run build` checks production compilation. Browser verification checks the actual WebGL scene, texture loading, mission completion and browser console; test results are recorded in the completion report.

## Physical and rendering limits

The model remains an educational 2D flight with a 3D view. Upper-stage motion is illustrative; return guidance steers toward a fixed coastal LZ-1 target. Aerodynamics, actuator strengths and spring/damper parameters are simplified. The atmosphere renderer is a compact real-time single-scattering approximation, not a full spectral multiple-scattering solver. Elevation affects shading, not ground collision geometry.

References: [NASA atmosphere guidance](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/earth-atmosphere-equation-metric/), [U.S. Standard Atmosphere 1976](https://ntrs.nasa.gov/api/citations/20060053240/downloads/20060053240.pdf), [Bruneton atmospheric-scattering reference](https://ebruneton.github.io/precomputed_atmospheric_scattering/), and the texture attribution file.

## Additional acceptance criteria: terrain, geographic continuity and exhaust

- Pad concrete and asphalt require real 2K PBR maps, white perimeter paint and a transparent touchdown scorch/scuff decal. Pad foundations remain below grade and markings above the top surface.
- LC-39A and LZ-1 coordinates define one great-circle frame, shared by Earth, clouds, local terrain and pad placement. No phase can substitute arbitrary land under the vehicle. The booster must travel offshore, reverse horizontal velocity and arrive within 1 m of the fixed target in the nominal numerical flight.
- The scattering sphere stays active from ground to space. Altitude-dependent aerial perspective and distance-based material blending use smooth functions; there is no altitude-triggered environment replacement.
- Exhaust must contain no solid cone meshes. Nine independently positioned additive particle jets begin at modeled nozzle exits; three remain active for high-thrust booster burns and one for final approach. Ambient pressure widens only the downstream envelope. Near-nozzle shock brightness and fading downwind smoke must be visible in browser inspection.
- Model dimensions and control gains remain illustrative. Regional imagery has native 250 m detail; the 2048-pixel WMS output is resampling, not a claim of higher satellite resolution.
