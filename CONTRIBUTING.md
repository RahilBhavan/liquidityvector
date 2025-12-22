# Contributing to Liquidity Vector

We welcome contributions from the community! Whether you're a developer, designer, or security researcher, your help is valuable.

## 🛠️ Development Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker (Optional but recommended)

### Quick Start
1.  **Fork & Clone**:
    ```bash
    git clone https://github.com/your-username/liquidityvector_gemini.git
    cd liquidityvector_gemini
    ```

2.  **Environment Variables**:
    Copy `.env.example` to `.env.local` (Frontend) and `api/.env` (Backend).
    ```bash
    cp .env.example .env.local
    cp .env.example api/.env
    ```

3.  **Run Locally**:
    ```bash
    # Terminal 1: Backend
    cd api && pip install -r requirements.txt && uvicorn main:app --reload

    # Terminal 2: Frontend
    npm install && npm run dev
    ```

---

## 📐 Coding Standards

### Frontend (TypeScript/React)
*   **Style**: We use **Prettier** and **ESLint**. Run `npm run lint` before committing.
*   **Components**: Use functional components. Prefer Tailwind CSS utility classes over custom CSS.
*   **State**: Use `React Query` for server state and `Context` for global app state. Avoid Redux unless absolutely necessary.

### Backend (Python)
*   **Style**: Follow **PEP 8**. We use `black` for formatting.
*   **Type Hints**: All function signatures must have type annotations.
*   **Testing**: Write unit tests for all new logic. Run `pytest` to verify.

---

## 🤝 Workflow

1.  **Find an Issue**: Check the [Issues](https://github.com/RahilBhavan/liquidityvector_gemini/issues) tab. Look for "Good First Issue" tags.
2.  **Create a Branch**: `git checkout -b feature/my-cool-feature`.
3.  **Commit**: Use conventional commits (e.g., `feat: add new bridge adapter`, `fix: correct gas calculation`).
4.  **Test**: Ensure the build passes (`npm run build` and `pytest`).
5.  **Pull Request**: Open a PR against `main`. Describe your changes clearly.

---

## 🔒 Security Policy

If you discover a security vulnerability, please **DO NOT** open a public issue.
Email `security@liquidityvector.com` (placeholder) immediately. We define "Critical" issues as those that could lead to incorrect financial advice causing loss of user funds.
