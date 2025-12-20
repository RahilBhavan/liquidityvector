# Rollback Procedure

> **WARNING:** Execute this procedure only when a critical incident is confirmed in production.

## 1. Immediate Mitigation (Code Revert)

**Trigger:** Critical bug in application logic (frontend/backend).

1.  **Identify Last Stable Tag:**
    ```bash
    git fetch --tags
    git tag --list
    # Identify the previous stable version (e.g., v1.0.0)
    ```

2.  **Revert Main Branch:**
    ```bash
    # Checkout main and ensure it's up to date
    git checkout main
    git pull origin main
    
    # Revert the merge commit of the faulty release
    # (Assuming the release was merged via PR)
    git revert -m 1 <MERGE_COMMIT_HASH>
    
    # Push the reversion to trigger the pipeline
    git push origin main
    ```

3.  **Verify Rollback:**
    *   Monitor CI/CD pipeline for successful deployment.
    *   Verify application health via `/health` endpoint.

## 2. Infrastructure Rollback

**Trigger:** Infrastructure configuration error (e.g., bad env var, wrong Docker image).

1.  **Redeploy Previous Artifact:**
    *   **Manual Trigger (GitHub Actions):**
        1.  Go to **Actions** tab.
        2.  Select **CI Pipeline**.
        3.  Find the workflow run for the *previous stable tag*.
        4.  Click **Re-run jobs**.

## 3. Database Recovery

**Trigger:** Data corruption or accidental deletion.

*   **Status:** Manual recovery required.
*   **Procedure:**
    1.  Locate latest backup in cloud provider console (AWS S3 / GCP Storage / etc.).
    2.  Stop the application to prevent new writes.
    3.  Restore database from backup snapshot.
    4.  Restart application.
