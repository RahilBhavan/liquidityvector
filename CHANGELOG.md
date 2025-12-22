# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-12-20

### Added
- **UI/UX**: Implemented "Liquidity Vector Terminal" design system (1-bit Brutalist).
- **Styling**: Added custom CSS-only dither patterns (`pattern-checker`, `pattern-stipple`, `pattern-diagonal`) for texture-based hierarchy.
- **Styling**: Added `shadow-hard` and `border-bit-black` utility classes for strict high-contrast borders and shadows.
- **Assets**: Added `Courier Prime` font for monospace body text.

### Changed
- **Global**: Enforced `border-radius: 0` globally and pixelated image rendering.
- **Typography**: switched headers to `Press Start 2P` and body to `Courier Prime`.
- **Components**: Refactored `Dashboard`, `Sidebar`, `Header`, and `RouteCard` to remove gradients/colors and use dither patterns.
- **Charts**: Updated `BreakevenChart` and `Heatmap` to use 1-bit palettes and stepped lines.
- **Performance**: Removed `framer-motion` for instant, snappy "terminal" interactions.

## [1.1.0] - 2025-12-20

### Added
- **API**: Initialized API service with Docker support (`Dockerfile`, `docker-compose.yml`).
- **API**: Added `config.py`, `pytest.ini`, and `requirements-dev.txt` for backend development.
- **API**: Added unit tests in `api/tests/` (`conftest.py`, `test_main.py`).
- **Contracts**: Updated bridge contracts (`BridgeHealthChecker`, `BridgeRegistry`, `BridgeStateMonitor`).
- **Contracts**: Updated deployment and configuration scripts in `contracts/script/`.
- **Project**: Added `.env.example` for environment variable template.

### Changed
- **Contracts**: Refactored risk scoring libraries.
- **Project**: Updated `package.json` and `package-lock.json` dependencies.
- **Project**: Updated `tsconfig.json` and Next.js configuration (`next.config.ts`).
