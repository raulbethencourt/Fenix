---
name: sugarcrm-testing
description: SugarCRM testing skill for writing and running tests across PHPUnit unit/integration tests, bns end-to-end curl tests, and local scheduler/batch execution with bns run-batch. Use when creating, running, or debugging tests for SugarCRM applications.
---

# SugarCRM Testing Skill

Use this skill when asked to create tests, run tests, debug test failures, or improve test coverage for SugarCRM projects.

## Test Frameworks + Local Scheduler Execution

### 1. End-to-End Curl Tests (bns test)

**Location**: `${TOOLS_PATH}/tests/`
**Run all**: `bns test -vvv --continue-on-fail | ccze -A`
**Run single**: `bns test -v --continue-on-fail --curl ${TOOLS_PATH}/tests/<testname>.curl | ccze -A`

#### JSON Output Mode
Use `--json` for structured, machine-readable results (verbose is forced to 0):
```bash
bns test --json --continue-on-fail --curl ${TOOLS_PATH}/tests/<name>.curl
```
Add `--include-json-contents` to also get response/payload bodies in the output.

For debugging failures with full trace, use verbose mode instead:
```bash
bns test -vvv --continue-on-fail --curl ${TOOLS_PATH}/tests/<name>.curl | ccze -A
```

Other useful flags:
- `--get-variables` — list all defined variables
- `--feed-missing-blueprints` — auto-generate blueprint reference files
- `--feed-missing-tolerances` — auto-generate tolerance patterns
- `--feed-missing-status` — auto-generate expected status files

#### File Structure

Each test can have multiple companion files:

| File | Purpose |
|------|---------|
| `<name>.curl` | The curl command (required) |
| `<name>.curl.setvariables` | Extract variables from JSON response for use in subsequent tests |
| `<name>.curl.matches` | Expected patterns in the response (assertions) |
| `<name>.curl.expectedstatus` | Expected HTTP status code |
| `<name>.curl.dependencies` | Tests that must run before this one |
| `<name>.curl.validation` | Validation rules |
| `<name>.curl.env` | Environment-specific variables |

#### Variable System & Automatic Dependency Resolution

The bns test runner has a sophisticated automatic dependency system:

1. **Before running any test**, the runner scans the curl file for all `${VARIABLE}` references
2. **For each variable**: if it's not already in the environment, the runner searches all `.setvariables` files to find which test **sets** that variable
3. **That dependency test is automatically executed first** (recursively resolving its own dependencies)
4. **Create tests are prioritized** — if multiple tests set the same variable, ones with "create" in the name are preferred
5. **PHPSESSID detection** — if a curl file contains `PHPSESSID`, the `php_login.curl` test is auto-added as dependency
6. **Circular dependency protection** — max depth of 20

This means: **you don't need to manually specify test order**. Just create a `.setvariables` file that captures IDs, and any test using those IDs will automatically depend on your create test.

**fields.txt** — Central field replacement configuration at `${TOOLS_PATH}/tests/fields.txt`. Defines four types of automatic replacements applied to all curl files before execution:

- **GREP** — Regex-based find/replace in the full curl command:
  ```
  GREP;rest/v[123]?[0-9].[0-9]+;rest/v'${BNS_TEST_API_VERSION//./_}'
  GREP;/Accounts/[0-9a-f]{8}-...-[0-9a-f]{12};/Accounts/'${ACCOUNT_ID}'
  ```

- **HEADER** — HTTP header value replacement:
  ```
  HEADER;OAuth-Token;${ACCESS_TOKEN}
  ```

- **FORM** — Form field value replacement (supports regex field names):
  ```
  FORM;[a-z_]*account_id;${ACCOUNT_ID}
  FORM;[a-z_]*contact_id;${CONTACT_ID}
  FORM;name;EDITED_BY_AUTOTESTS
  ```

- **JSON** — JSON body field replacement (uses jq paths):
  ```
  JSON;.billing_account_id;\"${ACCOUNT_ID}\"
  JSON;.assigned_user_id;\"1\"
  ```

**setvariables files** (`<test>.curl.setvariables`) — Extract values from response:
```
# JSON extraction (jq path syntax)
CREATED_ACCOUNT_ID=JSON:.id
CREATED_ACCOUNT=JSON:.

# Regex capture (use $[$]$ and $]$ for capture group)
QUOTE_ID=$[$][0-9a-f-]{36}$]$

# Eval (arbitrary bash)
MY_VAR=EVAL:echo "computed_value"

# Optional (won't fail if not found)
OPTIONAL;SOME_VAR=JSON:.optional_field
```

#### Companion Files (full list)

| File | Purpose | Details |
|------|---------|---------|
| `<name>.curl` | The curl command | **Required**. Raw curl copied from browser DevTools |
| `<name>.curl.setvariables` | Extract variables from response | `VAR=JSON:.path` or `VAR=EVAL:cmd` or `VAR=regex_with_$[$]$capture$]$` |
| `<name>.curl.matches` | Response assertions | One grep regex per line. Prefix `WARNING:` for non-fatal. Prefix `NOT,` to assert absence. Special: `IS_PDF`, `IS_JSON` |
| `<name>.curl.expectedstatus` | Expected HTTP status | `expectedStatus=200` or `expectedStatus=(200 201 204)` for multiple. `warningExpectedStatus=(302)` for non-fatal |
| `<name>.curl.dependencies` | Explicit dependencies | One test filename per line (e.g., `createAccount.curl`). Auto-deps via variables are usually sufficient |
| `<name>.curl.conditions` | Conditional execution | Bash script, test runs only if exit code is 0. Can check `$SUGAR_MAJOR_VERSION` etc. |
| `<name>.curl.optional` | Mark as optional | If present, failure doesn't count toward suite result |
| `<name>.curl.fields` | Per-test field overrides | Same format as fields.txt, applied after global fields |
| `<name>.curl.config` | Test configuration | Key=value pairs: `FORCE_SUCCESS=true`, `SKIP_IN_PRODUCTION=true`, `DOMAIN_REGEX1_INCLUDE=pattern`, etc. |
| `<name>.curl.blueprint` | Reference response | Full expected response for diff-based comparison |
| `<name>.curl.tolerance` | Tolerance patterns | Grep patterns for lines allowed to differ from blueprint |
| `<name>.curl.validation` | Custom validation | Bash script defining a `validation()` function, receives response on stdin. Return 0=pass, 1=error, 2=warning |
| `<name>.curl.env` | Environment filter | One env per line (e.g., `dev`, `staging`). Test only runs in matching env |
| `<name>.curl.order` | Execution priority | Integer. Lower = runs first (for ordering within the same dependency level) |

#### Test Execution Pipeline (what bns test does internally)

1. **URL rewriting** — Replaces hardcoded hosts with `$SITE_URL` (auto-detected from env or `--url`)
2. **Header stripping** — Removes Cookie, If-Modified-Since, If-None-Match, X-Metadata-Hash (uses cookie jar instead)
3. **API version replacement** — Rewrites `/rest/vXX_YY/` with `--api-version` value
4. **Field replacement** — Applies global `fields.txt` then per-test `.fields`
5. **Variable expansion** — Shell expands all `${VAR}` references
6. **Execution** — Runs curl with cookie jar, trace output, optional timeout
7. **Status check** — Compares HTTP status against expectedstatus (default: 200, 201, 204)
8. **Error detection** — Checks for XDebug errors, PHP fatal errors in response
9. **Blueprint diff** — If `.blueprint` exists, diffs response (with tolerance filtering)
10. **Pattern matching** — If `.matches` exists, greps each pattern in response
11. **Validation** — If `.validation` exists, runs custom bash validation
12. **Variable extraction** — If `.setvariables` exists and test passed, extracts variables for next tests

#### Built-in Variables (always available)

- `${SITE_URL}` — Full site URL (auto-detected or from `--url`)
- `${SITE_HOST}` — Protocol + hostname
- `${RANDOM_VALUE}` — Incrementing random number
- `${GENERATED_ID}` through `${GENERATED_ID_5}` — Fresh UUIDs for each test
- `${BNS_TEST_USER}` — Login username (default: `bnsadmin`)
- `${BNS_TEST_PASSWORD}` — Login password
- `${BNS_TEST_PLATFORM}` — Platform (default: `base`)
- `${BNS_TEST_API_VERSION}` — API version to use

#### When Creating New Curl Tests

1. **Capture from browser** — Use DevTools "Copy as cURL" on the request you want to test
2. **Save as** `${TOOLS_PATH}/tests/<name>.curl`
3. **Don't worry about hardcoded values** — the bns runner automatically:
   - Rewrites the host/URL to target the test environment
   - Replaces OAuth tokens via HEADER rule in fields.txt
   - Replaces record IDs via FORM/GREP rules in fields.txt
   - Strips session cookies (uses cookie jar)
   - Rewrites API version
4. **Create a `.setvariables` file** if the test creates a record:
   ```
   CREATED_MYMODULE_ID=JSON:.id
   ```
5. **Create a `.matches` file** for assertions:
   ```
   "id"
   "name"
   WARNING:"my_optional_field"
   ```
6. **Test dependencies are automatic** — if your test uses `${CREATED_ACCOUNT_ID}`, the runner will find and execute `createAccount.curl` first (because its `.setvariables` defines that variable)
7. **For explicit dependencies** (not variable-based), create a `.dependencies` file:
   ```
   createAccount.curl
   createQuote.curl
   ```
8. **For conditional tests**, create a `.conditions` file:
   ```bash
   [ "$SUGAR_MAJOR_VERSION" -ge 12 ]
   ```
9. **Use `.config`** for environment-specific behavior:
   ```
   SKIP_IN_PRODUCTION=true
   DOMAIN_REGEX1_INCLUDE=localhost
   ```


### 2. PHPUnit Tests (unit/integration)

**Location**: `${PROJECTS_PATH}/<project>/custom/tests/unit-php/`
**Current project test location**: `${PROJECTS_PATH}/<project>/custom/tests/unit-php/`
**New PHPUnit tests must be created in**: `${PROJECTS_PATH}/<project>/custom/tests/unit-php/`
**Config**: `custom/tests/unit-php/phpunit.xml.dist`
**Current project config**: `${PROJECTS_PATH}/<project>/custom/tests/unit-php/phpunit.xml.dist`
**Run single**: `./vendor/bin/phpunit --testdox -c custom/tests/unit-php/phpunit.xml.dist <test_file>`
**Run all**: `./vendor/bin/phpunit --testdox -c custom/tests/unit-php/phpunit.xml.dist`

**Framework**: PHPUnit 11.x on PHP 8.5+

**SugarCRM test patterns**:
- Extend `\PHPUnit\Framework\TestCase` for pure unit tests
- Use SugarCRM's `SugarTestHelper` when testing with Sugar context (beans, DB, etc.)
- Use `BeanFactory::getBean()` to create/retrieve test records
- Clean up test records in `tearDown()` or `tearDownAfterClass()`
- Mock Sugar services with PHPUnit mocks or custom test doubles
- Test custom logic hooks, API endpoints, schedulers, and business logic

**Naming conventions**:
- File: `<ModuleName><Feature>Test.php` (e.g., `BNS_NF525_TriggersIntegrationTest.php`)
- Class: matches filename
- Methods: `test<Behavior>()` with `@testdox` annotations for readable output

**When creating PHPUnit tests**:
1. Create new test files under `${PROJECTS_PATH}/<project>/custom/tests/unit-php/`
2. Read the source code being tested first
3. Look for existing tests in the same directory for style reference
4. Test public methods and their edge cases
5. Mock external dependencies (DB, API calls, file system)
6. For integration tests, use real Sugar beans but clean up after
7. Include `@testdox` annotations for clear test output
8. Group related assertions in focused test methods

### 3. Scheduler/Batch Execution (bns run-batch)

`bns run-batch` is **not a test framework**. It is a local execution command to manually trigger a SugarCRM scheduler/batch function.

**Run command**: `bns run-batch -vvvv <batchFunctionName>`
**Example**: `bns run-batch -vvvv bnsQuoteSendEmail`

**How to find `<batchFunctionName>`**:
1. Open the batch file in the Sugar app, typically under:
   `${PROJECTS_PATH}/<project>/custom/modules/Schedulers/bnsBatchFiles/<file>.php`
2. Use the PHP function name defined in that file.
   Example file: `bnsSessionAttestationSendByMail.php`
   Example function name: `bnsSessionAttestationSendByMail`

**When using run-batch for validation/debugging**:
1. Confirm target batch function and required input data/state
2. Run with `-vvvv` for maximum verbosity
3. Review console output and logs for errors and side effects
4. Validate expected business outcome (emails sent, records updated, etc.)

## Test Creation Workflow

When asked to create tests for SugarCRM code:

1. **Identify the validation type needed**:
   - Custom API endpoint / dashlet / PDF generation / custom action → curl test
   - PHP class / logic hook / utility / calculation → PHPUnit test
   - Scheduler / batch job / cron behavior validation → local `bns run-batch` execution

2. **Read existing tests** for the same module/feature as reference (use `find` and `read`)

3. **Read the source code** being tested to understand inputs/outputs/side effects

4. **Write the test** following the conventions above

5. **Run the check** to verify it works:
   - Curl: `bns test -v --continue-on-fail --curl ${TOOLS_PATH}/tests/<name>.curl | ccze -A`
   - PHPUnit: `./vendor/bin/phpunit --testdox -c custom/tests/unit-php/phpunit.xml.dist <file>`
   - Scheduler/batch local execution: `bns run-batch -vvvv <batchFunctionName>`

6. **Report results** clearly — pass/fail, output, diagnostics

### Log Files

- **Application logs**: `${PROJECTS_PATH}/<project>/bns_logs/bluenotecrm_MM_YYYY.log`
- **MySQL query logs**: `${PROJECTS_PATH}/<project>/bluenotecrm_MM_YYYY.log`

The filename uses the current month and year (e.g., `bluenotecrm_05_2026.log` for May 2026).

## Key SugarCRM Directories

- Custom modules: `custom/modules/<Module>/`
- Custom clients: `custom/clients/`
- Logic hooks: `custom/modules/<Module>/logic_hooks.php` or `custom/Extension/modules/<Module>/Ext/LogicHooks/`
- API endpoints: `custom/modules/<Module>/clients/base/api/`
- Schedulers: `custom/modules/Schedulers/Ext/ScheduledTasks/` or `custom/Extension/modules/Schedulers/Ext/ScheduledTasks/`
- Vardefs: `custom/Extension/modules/<Module>/Ext/Vardefs/`
- BWC views: `custom/modules/<Module>/views/` (view.edit.php, view.detail.php, etc.)
- Custom actions: `custom/modules/<Module>/<action_name>.php`

## Tips

- Use `ccze -A` for colorized output when running bns commands
- `--continue-on-fail` prevents test suite from stopping on first failure
- Verbosity levels: `-v` (normal), `-vv` (verbose), `-vvv` (very verbose), `-vvvv` (debug)
- PHPUnit `--testdox` produces human-readable test descriptions
- Always check that the SugarCRM instance is running before E2E tests
- The bns tool is at `${TOOLS_PATH}/bin/bns` (bash script)
- Tests hitting `localhost:8080` or `localhost:8100` are local dev instances
- Tests hitting `appli*.bluenote-crm.info` are remote staging/client instances — bns rewrites URLs based on environment
- The `fields.txt` file handles dynamic replacement of hardcoded values → variables, making tests portable across environments
