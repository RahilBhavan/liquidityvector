# Development Workflow & Contribution Guidelines

## Prerequisites
- **Node.js**: 20.x or higher
- **Python**: 3.11 or higher
- **Docker**: 24.0 or higher
- **Foundry**: Required for smart contract testing

## Local Environment Setup

### 1. Repository Initialization
```bash
git clone https://github.com/RahilBhavan/liquidityvector_gemini.git
cd liquidityvector_gemini
```

### 2. Backend Configuration
```bash
cd api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### 3. Frontend Configuration
```bash
# In the root directory
npm install
cp .env.example .env.local
```

## Standards & Quality Control

### TypeScript Standards
- **Strict Mode**: `strict: true` must be maintained in `tsconfig.json`.
- **Formatting**: Enforced via ESLint and Prettier.
- **Component Pattern**: Use functional components with explicit prop types.

### Python Standards
- **Style**: Follow PEP 8 guidelines.
- **Formatting**: Enforced via Black.
- **Type Safety**: Pydantic models must be used for all API request/response schemas.

### Testing Requirements
- **Unit Tests**: Required for any new economic logic in `core/economics/`.
- **Integration Tests**: Required for new API endpoints in `api/tests/`.
- **Verification**: Run `pytest` and `npm test` before submitting a Pull Request.

## Contribution Workflow
1. **Branching**: Create a feature branch from `develop`.
   - `feat/feature-name`
   - `fix/bug-name`
2. **Commits**: Use conventional commit messages (e.g., `feat: add new bridge adapter`).
3. **Pull Requests**: Submit PRs against the `develop` branch. Ensure the CI pipeline passes.

## Definition of Done
- [ ] Code is formatted and linted.
- [ ] Documentation is updated to reflect changes.
- [ ] Unit tests cover new logic (min 80% coverage).
- [ ] Build artifact success verified via Docker.