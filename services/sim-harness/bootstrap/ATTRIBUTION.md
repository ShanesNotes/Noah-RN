# Attribution

## Pulse Physiology Engine

This bootstrap wraps the **Pulse Physiology Engine**, a cross-platform
physiology simulator developed by Kitware, Inc. Pulse is distributed under
the Apache License, Version 2.0.

- Home page:  https://pulse.kitware.com
- Source:     https://gitlab.kitware.com/physiology/engine
- Docker:     https://hub.docker.com/r/kitware/pulse
- Version used: `kitware/pulse:4.3.1`

The upstream container ships its own `NOTICE` and `LICENSE` files at `/`.
Those files are preserved as-is through our FROM directive; no modification
is made to the engine itself.

### Transitive notices carried by Pulse

Pulse internally bundles at least the following third-party components.
Their notices are part of the upstream image's `NOTICE` file:

- [Eigen](https://eigen.tuxfamily.org) — MPL2
- [Protocol Buffers](https://developers.google.com/protocol-buffers) — BSD-3-Clause

## Our code

Everything under `services/sim-harness/bootstrap/` that is NOT the upstream
Pulse container is distributed under the same license as the parent
Noah RN repository.

## How to comply when redistributing

1. Keep the `FROM kitware/pulse:4.3.1` directive — do not strip the upstream
   `NOTICE` and `LICENSE` files from the image.
2. Include this `ATTRIBUTION.md` (or an equivalent notice) in any artifact
   that includes the built Docker image or the Pulse-derived binaries.
3. Preserve the Apache-2.0 license text from the upstream image in
   redistributions.
