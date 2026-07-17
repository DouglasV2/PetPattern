# WP6 — Backend reproducibility (Maven wrapper)

## Wrapper
Added the Maven wrapper so a fresh environment runs the backend tests without a globally installed
Maven: `backend/mvnw`, `backend/mvnw.cmd`, `backend/.mvn/wrapper/maven-wrapper.properties`
(`only-script` type — no jar, no binary/secret additions; pins Apache Maven 3.9.9 from Maven Central).

## Verification (this environment)
Ran the suite from a **clean state** in a JDK-only container **with no Maven installed**, so the
wrapper had to bootstrap Maven itself:

```
docker run --rm -v <backend>:/app -v <m2-cache>:/root/.m2 -w /app eclipse-temurin:21-jdk \
  bash -c "command -v mvn || echo 'NO global mvn'; bash mvnw clean test"
```
Output:
```
NO global mvn (good)
[INFO] Results:
[INFO] Tests run: 179, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

## Test-count reconciliation (honest)
| Metric | Count |
|---|---|
| `@Test` methods in source (`backend/src/test/**`) | 179 |
| `@Disabled` / `@Ignore` | 0 |
| `@ParameterizedTest` / `@RepeatedTest` (would multiply) | 0 |
| Tests **discovered** by Surefire | 179 |
| Tests **executed** | 179 |
| Skipped | 0 |
| Failures / Errors | 0 |

Discovered == executed == 179 with zero skips — no mismatch to investigate. (Baseline was 147;
WP1 added 15 and WP2 added 17.)

## Notes / limitations
- The suite is currently **unit tests only** (no `@SpringBootTest` / Testcontainers), so there is no
  DB-integration or Flyway-migration test yet. Migrations V1–V15 are exercised only when the app
  boots against Postgres (`docker compose up`), not by `mvn test`. Adding a migration-boot test is a
  recommended follow-up (noted in the final report).
- The production Docker image (`backend/Dockerfile`) still builds via the `maven:3.9.9` base image
  (which pins the same Maven). The wrapper is what CI and fresh clones use.
