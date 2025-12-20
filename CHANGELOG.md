# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
