# Phase 0 — Backend Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `api` module compile, boot, enforce roles server-side, identify users from JWT principals, support self-registration, emit audit logs, run on Postgres, and carry an integration test suite covering the loan rules.

**Architecture:** Stabilize the existing Kotlin/Spring Boot module in place: delete dead legacy code, repair the security configuration, switch MySQL→Postgres (spec D3), replace spoofable `X-User-Id` headers with JWT-principal identity, add `@PreAuthorize` role gates, add public registration, wire the orphaned audit writer, and lock behavior down with Testcontainers-Postgres integration tests.

**Tech Stack:** Kotlin 1.9.25, Spring Boot 3.3.5, JDK 17, Gradle 8.10.2 wrapper, Flyway, PostgreSQL 16 (Testcontainers), JUnit 5, spring-security-test, MockK.

## Global Constraints

- Kotlin `1.9.25`, Spring Boot `3.3.5`, Java `17` — do not bump versions.
- API responses keep the `ResponseModel(success, message, code, data)` envelope.
- Backend port stays `8082`.
- Loan constants stay `MAX_BOOKS_PER_MEMBER = 3`, `LOAN_PERIOD_DAYS = 21L`.
- Roles are exactly `ADMIN`, `LIBRARIAN`, `MEMBER` (`com.digihome.library.api.database.enums.UserRole`).
- Seeded logins from `V2__seed_data.sql`: usernames `admin`, `jane`, `john` (bcrypt-hashed passwords).
- Every task ends with its test cycle green and a git commit (conventional commits).
- Run Gradle commands from the `api/` directory: `./gradlew <task>`.
- Do NOT start Phase 1 work (Dockerfiles, workflows, compose) in this plan.

---

### Task 1: Delete legacy dead code

The 2021-era legacy classes reference symbols that no longer exist and break compilation.

**Files:**
- Delete: `api/src/main/kotlin/com/digihome/library/api/controller/BooksController.kt`
- Delete: `api/src/main/kotlin/com/digihome/library/api/controller/UserController.kt`
- Delete: `api/src/main/kotlin/com/digihome/library/api/database/dbservice/BooksDbService.kt`
- Delete: `api/src/main/kotlin/com/digihome/library/api/database/dbservice/UserDbService.kt`

**Interfaces:**
- Consumes: nothing.
- Produces: a compiling module. Later tasks assume these classes are gone (do not re-create them).

- [ ] **Step 1: Confirm nothing else references the legacy classes**

Run: `grep -rn "BooksDbService\|UserDbService\|BooksController\|UserController" api/src/main/kotlin --include="*.kt" | grep -v "controller/BooksController.kt\|controller/UserController.kt\|dbservice/BooksDbService.kt\|dbservice/UserDbService.kt"`
Expected: only matches inside the four files being deleted (note: `UserManagementController`/`UserManagementDbService` contain the substring `UserController` — ignore those, they are different classes).

- [ ] **Step 2: Delete the four files**

```bash
git rm api/src/main/kotlin/com/digihome/library/api/controller/BooksController.kt \
       api/src/main/kotlin/com/digihome/library/api/controller/UserController.kt \
       api/src/main/kotlin/com/digihome/library/api/database/dbservice/BooksDbService.kt \
       api/src/main/kotlin/com/digihome/library/api/database/dbservice/UserDbService.kt
```

- [ ] **Step 3: Verify compilation**

Run: `./gradlew compileKotlin` (from `api/`)
Expected: `BUILD SUCCESSFUL`. If it fails, the error names the remaining stale reference — fix it by deleting the referencing legacy file too, never by re-adding dead symbols.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(api): remove stale 2021-era legacy controllers and services"
```

---

### Task 2: Fix the `authenticationManager(null)` startup bug

`SecurityConfiguration.kt` passes `null` into the `authenticationManager` bean method when building the filter chain — guaranteed NPE at startup.

**Files:**
- Modify: `api/src/main/kotlin/com/digihome/library/api/security/SecurityConfiguration.kt:37-67`

**Interfaces:**
- Consumes: existing beans `authenticationManager(AuthenticationConfiguration)`, `JWTAuthenticationFilter`, `JWTAuthorizationFilter`.
- Produces: a valid `SecurityFilterChain` bean; both JWT filters receive a real `AuthenticationManager`. No signature changes downstream.

- [ ] **Step 1: Write the failing test**

Create `api/src/test/kotlin/com/digihome/library/api/security/SecurityConfigTest.kt`:

```kotlin
package com.digihome.library.api.security

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.web.SecurityFilterChain

@SpringBootTest
class SecurityConfigTest {

    @Autowired lateinit var filterChain: SecurityFilterChain

    @Test
    fun `security filter chain bean builds without NPE`() {
        org.junit.jupiter.api.Assertions.assertNotNull(filterChain)
    }
}
```

Note: this test needs a database because the context boots Flyway/JPA. It will fail differently until Task 3 switches to Postgres — that is acceptable; the failure to look for is `BUILD FAILED` vs later `BUILD SUCCESSFUL`. If you execute Task 3 before Task 2, this ordering is fine (tasks 2 and 3 are independent).

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew test --tests "com.digihome.library.api.security.SecurityConfigTest"`
Expected: FAIL (context fails to load — NPE building the filter chain, or DB connection error pre-Task-3).

- [ ] **Step 3: Fix the filter chain**

In `SecurityConfiguration.kt`, change the `filterChain` bean to receive the `AuthenticationManager` as an injected parameter and use it for both filters:

```kotlin
    @Bean
    fun filterChain(http: HttpSecurity, authManager: AuthenticationManager): SecurityFilterChain {
        http
            .cors { }
            .csrf { it.disable() }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers(HttpMethod.POST, jwtConfig.url).permitAll()
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    .requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                    .requestMatchers("/actuator/health").permitAll()
                    // Sprint 2: Allow public catalog browsing
                    .requestMatchers(HttpMethod.GET, "/api/books").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/books/{id}").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/books/search").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/books/{id}/copies").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/books/{id}/qr").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/categories").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/categories/{id}").permitAll()
                    .anyRequest().authenticated()
            }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .addFilter(JWTAuthenticationFilter(authManager, jwtConfig, objectMapper))
            .addFilter(JWTAuthorizationFilter(authManager, jwtConfig, objectMapper))

        return http.build()
    }
```

Only the method signature line and the two `.addFilter(...)` lines change; the authorization rules above are unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew test --tests "com.digihome.library.api.security.SecurityConfigTest"`
Expected: PASS (if DB-related failure persists, complete Task 3 then return here).

- [ ] **Step 5: Commit**

```bash
git add api/src/test/kotlin/com/digihome/library/api/security/SecurityConfigTest.kt api/src/main/kotlin/com/digihome/library/api/security/SecurityConfiguration.kt
git commit -m "fix(api): inject AuthenticationManager into filter chain instead of null"
```

---

### Task 3: Switch MySQL → Postgres (spec D3)

Rewrite Flyway migrations in Postgres dialect, swap drivers, rename the reserved-word table `user` → `users`.

**Files:**
- Modify: `api/build.gradle.kts:32-40`
- Rewrite: `api/src/main/resources/db/migration/V1__create_tables.sql`
- Modify: `api/src/main/resources/db/migration/V2__seed_data.sql:15`
- Modify: `api/src/main/kotlin/com/digihome/library/api/database/entity/UserEntity.kt:17`
- Modify: `api/src/main/resources/application.yml:4-17`
- Modify: `api/src/main/resources/application-dev.yml` and `api/src/main/resources/application-prod.yml` (same datasource/dialect replacements)

**Interfaces:**
- Consumes: nothing new.
- Produces: Postgres-schema migrations. Task 4's Testcontainers base class relies on `jdbc:postgresql` URLs working; all later SQL must target Postgres and table `users`.

- [ ] **Step 1: Swap build dependencies**

In `api/build.gradle.kts` replace:

```kotlin
    // Database
    runtimeOnly("com.mysql:mysql-connector-j")
```

with:

```kotlin
    // Database
    runtimeOnly("org.postgresql:postgresql")
```

and replace:

```kotlin
    // Flyway
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-mysql")
```

with:

```kotlin
    // Flyway
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
```

- [ ] **Step 2: Rewrite V1 migration in Postgres dialect**

Replace the entire contents of `api/src/main/resources/db/migration/V1__create_tables.sql` with:

```sql
-- Branch table
CREATE TABLE IF NOT EXISTS branch (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS category (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES category(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS books (
    id VARCHAR(36) PRIMARY KEY,
    isbn VARCHAR(13) DEFAULT '',
    book_name VARCHAR(200) NOT NULL,
    author VARCHAR(200) NOT NULL,
    publication VARCHAR(200) DEFAULT '',
    language VARCHAR(50) DEFAULT '',
    location VARCHAR(100) DEFAULT '',
    description TEXT DEFAULT '',
    cover_image_url VARCHAR(500) DEFAULT '',
    category_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS book_copies (
    id VARCHAR(36) PRIMARY KEY,
    book_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36) NOT NULL,
    barcode VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'LOANED', 'LOST', 'DAMAGED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    membership_id VARCHAR(20) DEFAULT '',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email_id VARCHAR(100) DEFAULT '',
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'LIBRARIAN', 'MEMBER')),
    membership_type VARCHAR(20) NOT NULL DEFAULT 'PUBLIC' CHECK (membership_type IN ('STUDENT', 'FACULTY', 'PUBLIC')),
    branch_id VARCHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS login (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    failed_attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS book_issue (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    copy_id VARCHAR(36) NOT NULL,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    return_date TIMESTAMP NULL,
    renewed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (copy_id) REFERENCES book_copies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS book_reservation (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    book_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'READY', 'EXPIRED', 'CANCELLED', 'FULFILLED')),
    queue_position INT DEFAULT 0,
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notified_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_log (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    email_type VARCHAR(50) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(10) NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'FAILED')),
    error_message TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_book_name ON books(book_name);
CREATE INDEX idx_book_copies_book_id ON book_copies(book_id);
CREATE INDEX idx_book_copies_branch_id ON book_copies(branch_id);
CREATE INDEX idx_book_copies_barcode ON book_copies(barcode);
CREATE INDEX idx_user_phone_number ON users(phone_number);
CREATE INDEX idx_user_email_id ON users(email_id);
CREATE INDEX idx_user_role ON users(role);
CREATE INDEX idx_login_username ON login(username);
CREATE INDEX idx_book_issue_user_id ON book_issue(user_id);
CREATE INDEX idx_book_issue_copy_id ON book_issue(copy_id);
CREATE INDEX idx_book_issue_due_date ON book_issue(due_date);
CREATE INDEX idx_book_reservation_user_id ON book_reservation(user_id);
CREATE INDEX idx_book_reservation_book_id ON book_reservation(book_id);
CREATE INDEX idx_book_reservation_status ON book_reservation(status);
```

Conversion rules applied (for reference): MySQL `ENUM(...)` → `VARCHAR(n) ... CHECK (... IN (...))`; `ON UPDATE CURRENT_TIMESTAMP` dropped (Hibernate `@UpdateTimestamp` handles updates); backticked reserved word `` `user` `` renamed to `users`; `JSON` kept (native in Postgres).

- [ ] **Step 3: Update V2 seed data**

In `api/src/main/resources/db/migration/V2__seed_data.sql` change line 15 from:

```sql
INSERT INTO `user` (id, membership_id, first_name, last_name, phone_number, email_id, role, membership_type, branch_id, is_active, created_by) VALUES
```

to:

```sql
INSERT INTO users (id, membership_id, first_name, last_name, phone_number, email_id, role, membership_type, branch_id, is_active, created_by) VALUES
```

No other V2 changes needed (all other inserts are dialect-neutral).

- [ ] **Step 4: Rename the entity's table mapping**

In `api/src/main/kotlin/com/digihome/library/api/database/entity/UserEntity.kt` change:

```kotlin
@Table(name = "user")
```

to:

```kotlin
@Table(name = "users")
```

- [ ] **Step 5: Update datasource configuration**

In `api/src/main/resources/application.yml` replace the datasource and dialect blocks:

```yaml
  datasource:
    url: jdbc:mysql://localhost:3306/library_db?allowPublicKeyRetrieval=true&useSSL=false
    driverClassName: com.mysql.cj.jdbc.Driver
    username: root
    password: root
```

becomes:

```yaml
  datasource:
    url: jdbc:postgresql://localhost:5432/library_db
    driverClassName: org.postgresql.Driver
    username: library
    password: library
```

and:

```yaml
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
```

becomes:

```yaml
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
```

Then open `application-dev.yml` and `application-prod.yml` and apply the identical three-line substitutions wherever they define a MySQL `url:`/`driverClassName:`/MySQL `dialect:` (keep any profile-specific host/port/credentials values, only changing engine, driver class, and dialect).

- [ ] **Step 6: Verify compilation**

Run: `./gradlew compileKotlin compileTestKotlin`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 7: Commit**

```bash
git add api/build.gradle.kts api/src/main/resources/db/migration/V1__create_tables.sql api/src/main/resources/db/migration/V2__seed_data.sql api/src/main/kotlin/com/digihome/library/api/database/entity/UserEntity.kt api/src/main/resources/application.yml api/src/main/resources/application-dev.yml api/src/main/resources/application-prod.yml
git commit -m "feat(api): switch database from MySQL to Postgres (Flyway dialect, driver, reserved-word table rename)"
```

---

### Task 4: Integration test infrastructure (Testcontainers Postgres)

**Files:**
- Modify: `api/build.gradle.kts` (test dependencies block, lines ~42-44)
- Create: `api/src/test/kotlin/com/digihome/library/api/support/AbstractIntegrationTest.kt`

**Interfaces:**
- Consumes: Postgres migrations from Task 3.
- Produces: `AbstractIntegrationTest` — every later integration test extends it and gets a real Postgres with migrated schema plus a running server on a random port.

- [ ] **Step 1: Add test dependencies**

In `api/build.gradle.kts`, extend the test block:

```kotlin
    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:postgresql")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("io.mockk:mockk:1.13.11")
```

(Versions for `org.testcontainers:*` are managed by the Spring Boot dependency-management plugin.)

- [ ] **Step 2: Create the base class**

Create `api/src/test/kotlin/com/digihome/library/api/support/AbstractIntegrationTest.kt`:

```kotlin
package com.digihome.library.api.support

import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
abstract class AbstractIntegrationTest {

    companion object {
        @Container
        @ServiceConnection
        @JvmStatic
        val postgres: PostgreSQLContainer<*> = PostgreSQLContainer("postgres:16-alpine")
    }

    @LocalServerPort
    protected var port: Int = 0
}
```

- [ ] **Step 3: Repoint the Task 2 test at the base class**

In `api/src/test/kotlin/com/digihome/library/api/security/SecurityConfigTest.kt`, replace the annotations and imports so the class reads:

```kotlin
package com.digihome.library.api.security

import com.digihome.library.api.support.AbstractIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.web.SecurityFilterChain

class SecurityConfigTest : AbstractIntegrationTest() {

    @Autowired lateinit var filterChain: SecurityFilterChain

    @Test
    fun `security filter chain bean builds without NPE`() {
        org.junit.jupiter.api.Assertions.assertNotNull(filterChain)
    }
}
```

- [ ] **Step 4: Run the test to verify the stack works end-to-end**

Run: `./gradlew test --tests "com.digihome.library.api.security.SecurityConfigTest"`
Expected: PASS — Docker pulls `postgres:16-alpine`, Flyway migrates, context loads. First run may take a few minutes.

- [ ] **Step 5: Commit**

```bash
git add api/build.gradle.kts api/src/test/kotlin/com/digihome/library/api/support/AbstractIntegrationTest.kt api/src/test/kotlin/com/digihome/library/api/security/SecurityConfigTest.kt
git commit -m "test(api): add Testcontainers Postgres integration test base"
```

---

### Task 5: Characterization tests for loan rules

Lock in existing business rules: 3-book cap, copy availability, double-checkout block, 21-day due date, return frees copy, renewal rules. These rules already exist in `CheckoutDbService` — tests must PASS once written (except the ownership rule added in Task 6).

**Files:**
- Create: `api/src/test/kotlin/com/digihome/library/api/database/dbservice/CheckoutDbServiceIntegrationTest.kt`

**Interfaces:**
- Consumes: `AbstractIntegrationTest`; `CheckoutDbService.checkout(CheckoutRequest): ServiceResponseModel`, `.returnBook(ReturnRequest)`, `.renewIssue(RenewRequest)`; repositories `UserRepository`, `BranchRepository`, `BooksRepository`, `BookCopyRepository`, `BookIssueRepository`, `BookReservationRepository`.
- Produces: regression protection relied on by Tasks 6–9 refactors.

- [ ] **Step 1: Write the test class**

Create `api/src/test/kotlin/com/digihome/library/api/database/dbservice/CheckoutDbServiceIntegrationTest.kt`:

```kotlin
package com.digihome.library.api.database.dbservice

import com.digihome.library.api.database.entity.*
import com.digihome.library.api.database.enums.CopyStatus
import com.digihome.library.api.database.enums.ReservationStatus
import com.digihome.library.api.models.CheckoutRequest
import com.digihome.library.api.models.RenewRequest
import com.digihome.library.api.models.ReturnRequest
import com.digihome.library.api.support.AbstractIntegrationTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import java.time.LocalDateTime

class CheckoutDbServiceIntegrationTest : AbstractIntegrationTest() {

    @Autowired lateinit var checkoutDbService: CheckoutDbService
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var branchRepository: BranchRepository
    @Autowired lateinit var booksRepository: BooksRepository
    @Autowired lateinit var bookCopyRepository: BookCopyRepository
    @Autowired lateinit var bookIssueRepository: BookIssueRepository
    @Autowired lateinit var bookReservationRepository: BookReservationRepository

    private fun newUser(suffix: String): UserEntity =
        userRepository.save(
            UserEntity(
                firstName = "Test", lastName = suffix, phoneNumber = "555-$suffix",
                emailId = "$suffix@test.com"
            )
        )

    private fun newCopy(suffix: String, status: CopyStatus = CopyStatus.AVAILABLE): BookCopyEntity {
        val branch = branchRepository.save(
            BranchEntity(name = "Branch-$suffix", address = "addr", phone = "555", email = "b$suffix@t.com")
        )
        val book = booksRepository.save(
            BooksEntity(bookName = "Book-$suffix", author = "Author", isbn = "isbn-$suffix")
        )
        return bookCopyRepository.save(
            BookCopyEntity(book = book, branch = branch, barcode = "BC-$suffix", status = status)
        )
    }

    @Test
    fun `checkout creates issue due in 21 days and marks copy LOANED`() {
        val user = newUser("cap-a")
        val copy = newCopy("cap-a")

        val before = LocalDateTime.now().minusSeconds(1)
        val response = checkoutDbService.checkout(CheckoutRequest(userId = user.id, copyId = copy.id))

        assertTrue(response.success)
        val issue = bookIssueRepository.findByCopyIdAndReturnDateIsNull(copy.id)!!
        assertTrue(issue.dueDate.isAfter(before.plusDays(20)))
        assertTrue(issue.dueDate.isBefore(before.plusDays(22)))
        assertEquals(CopyStatus.LOANED, bookCopyRepository.findById(copy.id).get().status)
    }

    @Test
    fun `fourth concurrent checkout exceeds limit of 3`() {
        val user = newUser("limit")
        val copies = (1..4).map { newCopy("limit-$it") }
        copies.take(3).forEach {
            checkoutDbService.checkout(CheckoutRequest(userId = user.id, copyId = it.id))
        }

        val ex = assertThrows<Exception> {
            checkoutDbService.checkout(CheckoutRequest(userId = user.id, copyId = copies[3].id))
        }
        assertTrue(ex.message!!.contains("Borrowing limit"))
    }

    @Test
    fun `cannot checkout a copy that is not AVAILABLE`() {
        val user = newUser("unavail")
        val copy = newCopy("unavail", CopyStatus.LOANED)

        val ex = assertThrows<Exception> {
            checkoutDbService.checkout(CheckoutRequest(userId = user.id, copyId = copy.id))
        }
        assertTrue(ex.message!!.contains("not available"))
    }

    @Test
    fun `same copy cannot be checked out twice`() {
        val userA = newUser("dbl-a")
        val userB = newUser("dbl-b")
        val copy = newCopy("dbl")

        checkoutDbService.checkout(CheckoutRequest(userId = userA.id, copyId = copy.id))

        val ex = assertThrows<Exception> {
            checkoutDbService.checkout(CheckoutRequest(userId = userB.id, copyId = copy.id))
        }
        assertTrue(ex.message!!.contains("already checked out"))
    }

    @Test
    fun `return frees the copy`() {
        val user = newUser("ret")
        val copy = newCopy("ret")
        checkoutDbService.checkout(CheckoutRequest(userId = user.id, copyId = copy.id))

        val response = checkoutDbService.returnBook(ReturnRequest(copyId = copy.id))

        assertTrue(response.success)
        assertEquals(CopyStatus.AVAILABLE, bookCopyRepository.findById(copy.id).get().status)
    }

    @Test
    fun `renew extends due date by 21 days exactly once`() {
        val user = newUser("ren")
        val copy = newCopy("ren")
        checkoutDbService.checkout(CheckoutRequest(userId = user.id, copyId = copy.id))
        val issue = bookIssueRepository.findByCopyIdAndReturnDateIsNull(copy.id)!!

        checkoutDbService.renewIssue(RenewRequest(issueId = issue.id), user.id, callerIsStaff = false)

        val renewed = bookIssueRepository.findById(issue.id).get()
        assertTrue(renewed.renewed)
        assertEquals(issue.dueDate.plusDays(21), renewed.dueDate)

        val ex = assertThrows<Exception> {
            checkoutDbService.renewIssue(RenewRequest(issueId = issue.id), user.id, callerIsStaff = false)
        }
        assertTrue(ex.message!!.contains("already been renewed"))
    }

    @Test
    fun `renew blocked when pending reservation exists`() {
        val user = newUser("resv")
        val copy = newCopy("resv")
        checkoutDbService.checkout(CheckoutRequest(userId = user.id, copyId = copy.id))
        val issue = bookIssueRepository.findByCopyIdAndReturnDateIsNull(copy.id)!!
        val reserver = newUser("resv-other")
        bookReservationRepository.save(
            BookReservationEntity(
                user = reserver, book = copy.book!!, branch = copy.branch!!,
                status = ReservationStatus.PENDING, queuePosition = 1
            )
        )

        val ex = assertThrows<Exception> {
            checkoutDbService.renewIssue(RenewRequest(issueId = issue.id), user.id, callerIsStaff = false)
        }
        assertTrue(ex.message!!.contains("pending reservations"))
    }
}
```

If compilation reports constructor mismatches for `BranchEntity`/`BooksEntity`/`BookReservationEntity` (not read during planning), open those entity files and align the named arguments with their actual property names — the semantics above stay fixed.

Note: `renewIssue` currently takes one argument; the three-argument form arrives in Step 2 of this task.

- [ ] **Step 2: Add the ownership parameter to `renewIssue` (needed by the tests above)**

In `api/src/main/kotlin/com/digihome/library/api/database/dbservice/CheckoutDbService.kt` change the signature and prepend the ownership guard:

```kotlin
    fun renewIssue(request: RenewRequest, callerId: String, callerIsStaff: Boolean): ServiceResponseModel {
        val issue = bookIssueRepository.findById(request.issueId)
            .orElseThrow { Exception("Issue not found: ${request.issueId}") }

        if (!callerIsStaff && issue.user?.id != callerId) {
            throw Exception("You can only renew your own checkouts")
        }
        // ... remainder of the existing method body unchanged
```

(The existing checks — returned, already-renewed, pending reservations — stay exactly as they are.)

- [ ] **Step 3: Update the production caller**

In `api/src/main/kotlin/com/digihome/library/api/controller/CheckoutController.kt`, update `renewIssue` (line ~79):

```kotlin
    @PostMapping("/api/checkout/{id}/renew")
    fun renewIssue(@PathVariable id: String, authentication: Authentication): ResponseEntity<ResponseModel> {
        logger.info("Renew request: issue=$id")
        return try {
            val callerIsStaff = authentication.authorities.any {
                it.authority == "ROLE_ADMIN" || it.authority == "ROLE_LIBRARIAN"
            }
            val serviceResponse = checkoutDbService.renewIssue(
                RenewRequest(issueId = id),
                authentication.principal as String,
                callerIsStaff
            )
            ResponseEntity(ResponseModel(true, serviceResponse.message, HttpStatus.OK.value()), HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Renew failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }
```

Add import `org.springframework.security.core.Authentication`.

- [ ] **Step 4: Run the tests**

Run: `./gradlew test --tests "com.digihome.library.api.database.dbservice.CheckoutDbServiceIntegrationTest"`
Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/test/kotlin/com/digihome/library/api/database/dbservice/CheckoutDbServiceIntegrationTest.kt api/src/main/kotlin/com/digihome/library/api/database/dbservice/CheckoutDbService.kt api/src/main/kotlin/com/digihome/library/api/controller/CheckoutController.kt
git commit -m "test(api): characterize loan rules; enforce renew ownership from JWT principal"
```

---

### Task 6: Replace `X-User-Id` headers with JWT principal identity

Nine endpoints trust a client-supplied `X-User-Id` header (spoofable, and the frontend never sends it — that is why scan/self endpoints are broken). The authorization filter already sets the JWT subject (user id) as the principal, so `@AuthenticationPrincipal` binds it directly.

**Files:**
- Modify: `api/src/main/kotlin/com/digihome/library/api/controller/CheckoutController.kt` (lines 46-62, 94-107, 109-124)
- Modify: `api/src/main/kotlin/com/digihome/library/api/controller/UserManagementController.kt` (lines ~111-165)
- Modify: `api/src/main/kotlin/com/digihome/library/api/controller/ReservationController.kt` (lines ~16-45)

**Interfaces:**
- Consumes: `JWTAuthorizationFilter` principal = user-id `String`.
- Produces: endpoints read identity exclusively from the security context. Frontend needs NO header anymore — only the `Authorization: Bearer` token.

- [ ] **Step 1: Swap the three CheckoutController endpoints**

In `CheckoutController.kt`, replace each `@RequestHeader("X-User-Id") userId: String` parameter with `@AuthenticationPrincipal userId: String`, i.e.:

```kotlin
    @PostMapping("/api/checkout/scan")
    fun scanCheckout(
        @AuthenticationPrincipal userId: String,
        @RequestBody request: ScanCheckoutRequest
    ): ResponseEntity<ResponseModel> { /* body unchanged */ }
```

```kotlin
    @GetMapping("/api/checkout/my")
    fun myCheckouts(@AuthenticationPrincipal userId: String): ResponseEntity<ResponseModel> { /* body unchanged */ }
```

```kotlin
    @GetMapping("/api/checkout/history")
    fun checkoutHistory(@AuthenticationPrincipal userId: String): ResponseEntity<ResponseModel> { /* body unchanged */ }
```

Add import `org.springframework.security.core.annotation.AuthenticationPrincipal`.

- [ ] **Step 2: Swap the three UserManagementController endpoints**

Same substitution in `UserManagementController.kt` for `getProfile` (GET `/api/users/me`), profile update (PUT `/api/users/me`), and password change (PUT `/api/users/me/password`) — every `@RequestHeader("X-User-Id") userId: String` becomes `@AuthenticationPrincipal userId: String`. Add the same import.

- [ ] **Step 3: Swap the three ReservationController endpoints**

Same substitution in `ReservationController.kt` for `reserveBook` (POST `/api/reservations`), `cancelReservation` (POST `/api/reservations/{id}/cancel`), `myReservations` (GET `/api/reservations/my`). Add the same import.

- [ ] **Step 4: Write the proving test**

Append to `CheckoutDbServiceIntegrationTest.kt` (or create `ScanEndpointIntegrationTest.kt` extending `AbstractIntegrationTest`):

```kotlin
    @Autowired lateinit var passwordEncoder: org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
    @Autowired lateinit var loginRepository: LoginRepository
    @Autowired lateinit var restTemplate: org.springframework.boot.test.web.client.TestRestTemplate

    private fun loginAs(user: UserEntity, username: String, password: String): String {
        loginRepository.save(
            LoginEntity(user = user, username = username, password = passwordEncoder.encode(password))
        )
        val response = restTemplate.postForEntity(
            "http://localhost:$port/api/auth/login",
            org.springframework.http.HttpEntity(com.digihome.library.api.models.LoginModel(username, password)),
            String::class.java
        )
        return response.headers.getFirst("Authorization")!!
    }

    @Test
    fun `scan checkout works with bearer token alone - no X-User-Id header`() {
        val user = newUser("scan")
        val copy = newCopy("scan")
        val token = loginAs(user, "scan-user", "password1")

        val headers = org.springframework.http.HttpHeaders().apply {
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            bearerAuth(token.removePrefix("Bearer "))
        }
        val response = restTemplate.postForEntity(
            "http://localhost:$port/api/checkout/scan",
            org.springframework.http.HttpEntity(mapOf("barcode" to copy.barcode), headers),
            String::class.java
        )

        assertEquals(org.springframework.http.HttpStatus.OK, response.statusCode)
    }
```

Add imports `org.junit.jupiter.api.Assertions.assertEquals`, `com.digihome.library.api.database.entity.LoginEntity`, `com.digihome.library.api.database.entity.LoginRepository`.

- [ ] **Step 5: Run the tests**

Run: `./gradlew test`
Expected: all tests PASS, including the new scan-endpoint test (before this task it failed with 400/500 because the header was missing).

- [ ] **Step 6: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/controller/CheckoutController.kt api/src/main/kotlin/com/digihome/library/api/controller/UserManagementController.kt api/src/main/kotlin/com/digihome/library/api/controller/ReservationController.kt api/src/test/kotlin/
git commit -m "fix(api): derive user identity from JWT principal instead of spoofable X-User-Id header"
```

---

### Task 7: Server-side role enforcement (`@PreAuthorize`)

Role gating currently exists only in the frontend. `@EnableMethodSecurity(prePostEnabled = true)` is already declared in `SecurityConfiguration.kt:20`.

**Files:**
- Modify: `api/src/main/kotlin/com/digihome/library/api/controller/BookManagementController.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/controller/UserManagementController.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/controller/BranchController.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/controller/CategoryController.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/controller/AuditLogController.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/controller/ReservationController.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/controller/CheckoutController.kt`
- Test: `api/src/test/kotlin/com/digihome/library/api/security/RoleEnforcementIntegrationTest.kt`

**Interfaces:**
- Consumes: `ROLE_*` authorities granted by `JWTAuthorizationFilter`.
- Produces: enforced matrix — ADMIN-only: user management CRUD/search, branches CUD, audit logs; ADMIN+LIBRARIAN: book mutations, copy ops, categories POST, reservations ready/fulfill, desk checkout/return; MEMBER self-service endpoints unchanged.

- [ ] **Step 1: Write the failing test**

Create `api/src/test/kotlin/com/digihome/library/api/security/RoleEnforcementIntegrationTest.kt`:

```kotlin
package com.digihome.library.api.security

import com.digihome.library.api.database.entity.LoginEntity
import com.digihome.library.api.database.entity.UserEntity
import com.digihome.library.api.database.entity.LoginRepository
import com.digihome.library.api.database.entity.UserRepository
import com.digihome.library.api.database.enums.UserRole
import com.digihome.library.api.models.LoginModel
import com.digihome.library.api.support.AbstractIntegrationTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType

class RoleEnforcementIntegrationTest : AbstractIntegrationTest() {

    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var loginRepository: LoginRepository
    @Autowired lateinit var passwordEncoder: org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
    @Autowired lateinit var restTemplate: TestRestTemplate

    private fun makeUser(suffix: String, role: UserRole): Pair<UserEntity, String> {
        val user = userRepository.save(
            UserEntity(firstName = "R", lastName = suffix, phoneNumber = "1$suffix",
                emailId = "$suffix@role.t", role = role)
        )
        loginRepository.save(
            LoginEntity(user = user, username = "role-$suffix", password = passwordEncoder.encode("password1"))
        )
        return user to "role-$suffix"
    }

    private fun bearer(username: String): HttpHeaders {
        val login = restTemplate.postForEntity(
            "http://localhost:$port/api/auth/login",
            HttpEntity(LoginModel(username, "password1")),
            String::class.java
        )
        return HttpHeaders().apply {
            set(HttpHeaders.AUTHORIZATION, login.headers.getFirst(HttpHeaders.AUTHORIZATION))
        }
    }

    @Test
    fun `member cannot list all users - admin can`() {
        val (_, memberUsername) = makeUser("m${System.nanoTime()}", UserRole.MEMBER)
        val (_, adminUsername) = makeUser("a${System.nanoTime()}", UserRole.ADMIN)

        val memberResponse = restTemplate.exchange(
            "http://localhost:$port/api/users", org.springframework.http.HttpMethod.GET,
            HttpEntity<Void>(bearer(memberUsername)), String::class.java
        )
        assertEquals(HttpStatus.FORBIDDEN, memberResponse.statusCode)

        val adminResponse = restTemplate.exchange(
            "http://localhost:$port/api/users", org.springframework.http.HttpMethod.GET,
            HttpEntity<Void>(bearer(adminUsername)), String::class.java
        )
        assertEquals(HttpStatus.OK, adminResponse.statusCode)
    }

    @Test
    fun `member cannot create book - librarian can`() {
        val (_, memberUsername) = makeUser("mb${System.nanoTime()}", UserRole.MEMBER)
        val (_, libUsername) = makeUser("lb${System.nanoTime()}", UserRole.LIBRARIAN)
        val body = mapOf("bookName" to "T", "author" to "A")

        val headers = bearer(memberUsername); headers.contentType = MediaType.APPLICATION_JSON
        val memberResponse = restTemplate.postForEntity(
            "http://localhost:$port/api/books", HttpEntity(body, headers), String::class.java
        )
        assertEquals(HttpStatus.FORBIDDEN, memberResponse.statusCode)

        val libHeaders = bearer(libUsername); libHeaders.contentType = MediaType.APPLICATION_JSON
        val libResponse = restTemplate.postForEntity(
            "http://localhost:$port/api/books", HttpEntity(body, libHeaders), String::class.java
        )
        assertEquals(HttpStatus.OK, libResponse.statusCode)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew test --tests "com.digihome.library.api.security.RoleEnforcementIntegrationTest"`
Expected: FAIL — member requests currently return 200 (no server-side gate).

- [ ] **Step 3: Apply the annotation matrix**

Add `import org.springframework.security.access.prepost.PreAuthorize` to each controller, then annotate exactly these handlers:

`BookManagementController.kt` — on `POST /api/books` (create), `PUT /api/books/{id}`, `POST /api/books/{id}/copies`, `POST /api/books/{id}/transfer`:

```kotlin
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
```

`UserManagementController.kt` — on `POST /api/users`, `PUT /api/users/{id}`, `GET /api/users/{id}`, `GET /api/users`, `GET /api/users/search`:

```kotlin
    @PreAuthorize("hasRole('ADMIN')")
```

(`GET /api/users/me*` endpoints stay unannotated.)

`BranchController.kt` — on `POST /api/branches`, `PUT /api/branches/{id}`, `DELETE /api/branches/{id}`:

```kotlin
    @PreAuthorize("hasRole('ADMIN')")
```

`CategoryController.kt` — on `POST /api/categories`:

```kotlin
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
```

`AuditLogController.kt` — on `GET /api/audit-logs`:

```kotlin
    @PreAuthorize("hasRole('ADMIN')")
```

`ReservationController.kt` — on `POST /api/reservations/{id}/ready` and `POST /api/reservations/{id}/fulfill`:

```kotlin
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
```

(`reserve`, `cancel`, `my` stay unannotated.)

`CheckoutController.kt` — on `POST /api/checkout` and `POST /api/return` (desk operations acting on behalf of a user):

```kotlin
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
```

(scan/self/history/renew endpoints stay unannotated — they are principal-scoped.)

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew test`
Expected: entire suite PASS including both new role tests.

- [ ] **Step 5: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/controller/ api/src/test/kotlin/com/digihome/library/api/security/RoleEnforcementIntegrationTest.kt
git commit -m "feat(api): enforce ADMIN/LIBRARIAN/MEMBER roles server-side via @PreAuthorize"
```

---

### Task 8: Public self-registration endpoint

Instant activation (spec D5): creates an active MEMBER user + login; email doubles as username.

**Files:**
- Create: `api/src/main/kotlin/com/digihome/library/api/models/AuthModels.kt`
- Create: `api/src/main/kotlin/com/digihome/library/api/controller/AuthController.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/database/dbservice/UserManagementDbService.kt`
- Test: `api/src/test/kotlin/com/digihome/library/api/security/RegistrationIntegrationTest.kt`

**Interfaces:**
- Consumes: `UserRepository.findByEmailId`, `UserRepository.findByMembershipId`, `LoginRepository.findByUsername`, `BCryptPasswordEncoder` bean; `/api/auth/**` is already `permitAll` in `SecurityConfiguration.kt:45`.
- Produces: `POST /api/auth/register` with body `{firstName, lastName, email, password, phoneNumber?, membershipId?}` → `ResponseModel` whose `data` is `{id, firstName, lastName, role, email}`. Errors surface as `success=false` with message.

- [ ] **Step 1: Write the failing test**

Create `api/src/test/kotlin/com/digihome/library/api/security/RegistrationIntegrationTest.kt`:

```kotlin
package com.digihome.library.api.security

import com.digihome.library.api.database.entity.LoginRepository
import com.digihome.library.api.database.entity.UserRepository
import com.digihome.library.api.models.LoginModel
import com.digihome.library.api.support.AbstractIntegrationTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.http.HttpEntity
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType

class RegistrationIntegrationTest : AbstractIntegrationTest() {

    @Autowired lateinit var restTemplate: TestRestTemplate
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var loginRepository: LoginRepository

    private fun registerBody(email: String) = mapOf(
        "firstName" to "New", "lastName" to "Member", "email" to email,
        "password" to "secret1", "phoneNumber" to "+1-555-0000", "membershipId" to ""
    )

    @Test
    fun `register creates active member who can immediately log in`() {
        val email = "reg-${System.nanoTime()}@example.com"

        val response = restTemplate.postForEntity(
            "http://localhost:$port/api/auth/register",
            HttpEntity(registerBody(email), MediaType.APPLICATION_JSON.let { HttpHeaders().apply { contentType = it } }),
            String::class.java
        )
        assertEquals(HttpStatus.OK, response.statusCode)
        assertTrue(response.body!!.contains("\"role\":\"MEMBER\""))

        val saved = userRepository.findByEmailId(email)!!
        assertTrue(saved.isActive)
        assertEquals(com.digihome.library.api.database.enums.UserRole.MEMBER, saved.role)
        assertEquals(email, loginRepository.findByUsername(email)!!.username)

        val login = restTemplate.postForEntity(
            "http://localhost:$port/api/auth/login",
            HttpEntity(LoginModel(email, "secret1")),
            String::class.java
        )
        assertEquals(HttpStatus.OK, login.statusCode)
    }

    @Test
    fun `duplicate email registration is rejected`() {
        val email = "dup-${System.nanoTime()}@example.com"
        restTemplate.postForEntity(
            "http://localhost:$port/api/auth/register", HttpEntity(registerBody(email)), String::class.java
        )
        val second = restTemplate.postForEntity(
            "http://localhost:$port/api/auth/register", HttpEntity(registerBody(email)), String::class.java
        )
        assertEquals(HttpStatus.BAD_REQUEST, second.statusCode)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew test --tests "com.digihome.library.api.security.RegistrationIntegrationTest"`
Expected: FAIL — 404/403, endpoint does not exist yet.

- [ ] **Step 3: Create the request model**

Create `api/src/main/kotlin/com/digihome/library/api/models/AuthModels.kt`:

```kotlin
package com.digihome.library.api.models

data class RegisterRequest(
    var firstName: String = "",
    var lastName: String = "",
    var email: String = "",
    var password: String = "",
    var phoneNumber: String = "",
    var membershipId: String = ""
)
```

- [ ] **Step 4: Extend `UserManagementDbService` with `register`**

Open `api/src/main/kotlin/com/digihome/library/api/database/dbservice/UserManagementDbService.kt`. Add to the constructor parameters:

```kotlin
    val passwordEncoder: org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder,
    val loginRepository: LoginRepository
```

Add imports for `LoginEntity`, `LoginRepository`, `RegisterRequest`, `MembershipType`, `UserRole`, `org.springframework.transaction.annotation.Transactional`. Then add the method:

```kotlin
    @Transactional
    fun register(request: RegisterRequest): UserEntity {
        require(request.firstName.isNotBlank()) { "First name is required" }
        require(request.lastName.isNotBlank()) { "Last name is required" }
        require(request.email.isNotBlank() && "@" in request.email) { "A valid email is required" }
        require(request.password.length >= 6) { "Password must be at least 6 characters" }

        userRepository.findByEmailId(request.email)?.let {
            throw Exception("Email is already registered")
        }
        loginRepository.findByUsername(request.email)?.let {
            throw Exception("Username is already taken")
        }
        if (request.membershipId.isNotBlank()) {
            userRepository.findByMembershipId(request.membershipId)?.let {
                throw Exception("Membership ID is already in use")
            }
        }

        val user = userRepository.save(
            UserEntity(
                firstName = request.firstName.trim(),
                lastName = request.lastName.trim(),
                phoneNumber = request.phoneNumber,
                emailId = request.email.trim().lowercase(),
                role = UserRole.MEMBER,
                membershipType = MembershipType.PUBLIC,
                isActive = true,
                createdBy = "self-registration"
            )
        )
        loginRepository.save(
            LoginEntity(
                user = user,
                username = request.email.trim().lowercase(),
                password = passwordEncoder.encode(request.password)
            )
        )
        return user
    }
```

(If the existing constructor uses a different parameter style, append the two new parameters in the same style; do not reorder existing ones.)

- [ ] **Step 5: Create the controller**

Create `api/src/main/kotlin/com/digihome/library/api/controller/AuthController.kt`:

```kotlin
package com.digihome.library.api.controller

import com.digihome.library.api.database.dbservice.UserManagementDbService
import com.digihome.library.api.models.RegisterRequest
import com.digihome.library.api.models.ResponseModel
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

@RestController
class AuthController(
    val userManagementDbService: UserManagementDbService
) {
    val logger = LoggerFactory.getLogger(this::class.java)

    @PostMapping("/api/auth/register")
    fun register(@RequestBody request: RegisterRequest): ResponseEntity<ResponseModel> {
        logger.info("Registration attempt: email=${request.email}")
        return try {
            val user = userManagementDbService.register(request)
            ResponseEntity(
                ResponseModel(
                    true, "Registration successful", HttpStatus.OK.value(),
                    mapOf(
                        "id" to user.id, "firstName" to user.firstName, "lastName" to user.lastName,
                        "role" to user.role.name, "email" to user.emailId
                    )
                ),
                HttpStatus.OK
            )
        } catch (e: Exception) {
            logger.error("Registration failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `./gradlew test --tests "com.digihome.library.api.security.RegistrationIntegrationTest"`
Expected: both tests PASS.

- [ ] **Step 7: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/models/AuthModels.kt api/src/main/kotlin/com/digihome/library/api/controller/AuthController.kt api/src/main/kotlin/com/digihome/library/api/database/dbservice/UserManagementDbService.kt api/src/test/kotlin/com/digihome/library/api/security/RegistrationIntegrationTest.kt
git commit -m "feat(api): public self-registration with instant activation (email as username)"
```

---

### Task 9: Wire the audit-log writer into mutation flows

`AuditLogDbService.logAction(userId, action, entityType, entityId, details)` exists but is never called. Wire it at the controller layer where the authenticated principal is available.

**Files:**
- Modify: `api/src/main/kotlin/com/digihome/library/api/controller/CheckoutController.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/controller/BookManagementController.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/database/dbservice/BookManagementDbService.kt`
- Test: extend `api/src/test/kotlin/com/digihome/library/api/security/RoleEnforcementIntegrationTest.kt`

**Interfaces:**
- Consumes: `AuditLogDbService.logAction(userId: String?, action: String, entityType: String, entityId: String, details: String? = null)`; `GET /api/audit-logs` (ADMIN) returns entries keyed `action`, `entityType`, `entityId`.
- Produces: audit rows for CHECKOUT, RETURN, RENEW, BOOK_CREATE, BOOK_UPDATE.

- [ ] **Step 1: Write the failing test**

Append to `RoleEnforcementIntegrationTest.kt`:

```kotlin
    @Test
    fun `desk checkout writes an audit log entry`() {
        val (member, _) = makeUser("aud${System.nanoTime()}", UserRole.MEMBER)
        val (_, adminUsername) = makeUser("aa${System.nanoTime()}", UserRole.ADMIN)
        val branch = branchRepository.save(
            com.digihome.library.api.database.entity.BranchEntity(
                name = "AudB", address = "a", phone = "p", email = "ab@t.com")
        )
        val book = booksRepository.save(
            com.digihome.library.api.database.entity.BooksEntity(bookName = "AudBook", author = "A", isbn = "aud"))
        val copy = bookCopyRepository.save(
            com.digihome.library.api.database.entity.BookCopyEntity(
                book = book, branch = branch, barcode = "AUD-1"))

        val deskHeaders = bearer(adminUsername)
        deskHeaders.contentType = MediaType.APPLICATION_JSON
        val checkoutResponse = restTemplate.postForEntity(
            "http://localhost:$port/api/checkout",
            HttpEntity(mapOf("userId" to member.id, "copyId" to copy.id), deskHeaders), String::class.java
        )
        assertEquals(HttpStatus.OK, checkoutResponse.statusCode)

        val logs = restTemplate.exchange(
            "http://localhost:$port/api/audit-logs", org.springframework.http.HttpMethod.GET,
            HttpEntity<Void>(bearer(adminUsername)), String::class.java
        )
        assertEquals(HttpStatus.OK, logs.statusCode)
        assertTrue(logs.body!!.contains("\"action\":\"CHECKOUT\""))
    }
```

Add `@Autowired lateinit var branchRepository: com.digihome.library.api.database.entity.BranchRepository`, `booksRepository: com.digihome.library.api.database.entity.BooksRepository`, `bookCopyRepository: com.digihome.library.api.database.entity.BookCopyRepository` to the test class.

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew test --tests "com.digihome.library.api.security.RoleEnforcementIntegrationTest"`
Expected: FAIL — no CHECKOUT entries exist yet.

- [ ] **Step 3: Wire audit into CheckoutController**

Inject the service and log after each successful mutation. In `CheckoutController.kt`:

Constructor becomes:

```kotlin
@RestController
class CheckoutController(
    val checkoutDbService: CheckoutDbService,
    val auditLogDbService: com.digihome.library.api.database.dbservice.AuditLogDbService
) {
```

Inside `checkout(...)`, in the success path directly after `val serviceResponse = checkoutDbService.checkout(request)`:

```kotlin
            auditLogDbService.logAction(
                userId = request.userId, action = "CHECKOUT", entityType = "BOOK_ISSUE",
                entityId = request.copyId, details = "desk checkout"
            )
```

Inside `returnBook(...)` success path:

```kotlin
            auditLogDbService.logAction(
                userId = null, action = "RETURN", entityType = "BOOK_COPY",
                entityId = request.copyId, details = "desk return"
            )
```

Inside `scanCheckout(...)` success path:

```kotlin
            auditLogDbService.logAction(
                userId = userId, action = "CHECKOUT", entityType = "BOOK_ISSUE",
                entityId = request.barcode, details = "scan checkout"
            )
```

Inside `scanReturn(...)` success path:

```kotlin
            auditLogDbService.logAction(
                userId = null, action = "RETURN", entityType = "BOOK_COPY",
                entityId = request.barcode, details = "scan return"
            )
```

Inside `renewIssue(...)` success path (after `serviceResponse` is obtained):

```kotlin
            auditLogDbService.logAction(
                userId = authentication.principal as String, action = "RENEW",
                entityType = "BOOK_ISSUE", entityId = id
            )
```

- [ ] **Step 4: Wire audit into book mutations (service layer owns the entity id)**

`createBook` generates the book id internally and returns only a message, so book auditing lives in `BookManagementDbService` where the id exists. In `api/src/main/kotlin/com/digihome/library/api/database/dbservice/BookManagementDbService.kt`:

Append to the constructor parameters (do not reorder existing ones):

```kotlin
    val auditLogDbService: AuditLogDbService
```

(`AuditLogDbService` is in the same package — no import needed.)

Change `createBook` (line ~34) — add an `actorId` parameter and log after save:

```kotlin
    fun createBook(request: BookCreateRequest, actorId: String?): ServiceResponseModel {
        val category = request.categoryId?.let {
            categoryRepository.findById(it).orElseThrow { Exception("Category not found: $it") }
        }

        val book = BooksEntity(
            id = UUID.randomUUID().toString(),
            isbn = request.isbn,
            bookName = request.bookName,
            author = request.author,
            publication = request.publication,
            language = request.language,
            location = request.location,
            description = request.description,
            coverImageUrl = request.coverImageUrl,
            category = category
        )

        booksRepository.save(book)
        auditLogDbService.logAction(
            userId = actorId, action = "BOOK_CREATE", entityType = "BOOK",
            entityId = book.id, details = request.bookName
        )
        return ServiceResponseModel(true, "Book created successfully")
    }
```

Change `updateBook` (line ~56) the same way — add `actorId: String?` parameter, keep the body identical except inserting the log call after `booksRepository.save(book)`:

```kotlin
    fun updateBook(bookId: String, request: BookUpdateRequest, actorId: String?): ServiceResponseModel {
        // ... existing body unchanged ...
        booksRepository.save(book)
        auditLogDbService.logAction(
            userId = actorId, action = "BOOK_UPDATE", entityType = "BOOK",
            entityId = bookId, details = request.bookName
        )
        return ServiceResponseModel(true, "Book updated successfully")
    }
```

In `BookManagementController.kt`, add constructor param `val auditLogDbService: AuditLogDbService` (import `com.digihome.library.api.database.dbservice.AuditLogDbService`) plus imports `org.springframework.security.core.Authentication` and `org.springframework.security.access.prepost.PreAuthorize`, then update both callers:

```kotlin
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    fun createBook(
        @RequestBody request: BookCreateRequest,
        authentication: Authentication
    ): ResponseEntity<ResponseModel> {
        logger.info("Create book request: ${request.bookName}")
        return try {
            val response = bookManagementDbService.createBook(request, authentication.principal as String)
            ResponseEntity(response, HttpStatus.CREATED)
        } catch (e: Exception) {
            logger.error("Create book failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }
```

```kotlin
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    fun updateBook(
        @PathVariable id: String,
        @RequestBody request: BookUpdateRequest,
        authentication: Authentication
    ): ResponseEntity<ResponseModel> {
        logger.info("Update book request: $id")
        return try {
            val response = bookManagementDbService.updateBook(id, request, authentication.principal as String)
            ResponseEntity(response, HttpStatus.OK)
        } catch (e: Exception) {
            logger.error("Update book failed: ${e.message}")
            ResponseEntity(
                ResponseModel(success = false, message = e.message, code = HttpStatus.BAD_REQUEST.value()),
                HttpStatus.BAD_REQUEST
            )
        }
    }
```

(The `@PreAuthorize` annotations were already added in Task 7 — keep them.)

- [ ] **Step 5: Run test to verify it passes**

Run: `./gradlew test`
Expected: whole suite PASS including the audit test.

- [ ] **Step 6: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/controller/CheckoutController.kt api/src/main/kotlin/com/digihome/library/api/controller/BookManagementController.kt api/src/test/kotlin/com/digihome/library/api/security/RoleEnforcementIntegrationTest.kt
git commit -m "feat(api): write audit log entries for circulation and book mutations"
```

---

### Task 10: Remove the phantom `/auth/refresh` call from the frontend

The frontend calls `POST /auth/refresh`, which has never existed in the backend. On expiry the correct behavior is logout + redirect to login.

**Files:**
- Modify: `frontend/src/services/authService.ts` (delete `refreshToken()` at lines 12-13)
- Modify: whichever file calls `refreshToken()` (locate in Step 1)

**Interfaces:**
- Consumes: backend has no `/auth/refresh` (confirmed by grep over `api/src`).
- Produces: on 401, the axios layer redirects to `/login` instead of attempting refresh.

- [ ] **Step 1: Locate all usages**

Run: `grep -rn "refreshToken\|auth/refresh" frontend/src`
Expected: definition in `authService.ts:12-13` plus one or more call sites (typically an axios response interceptor).

- [ ] **Step 2: Delete the method and replace call sites**

Delete from `frontend/src/services/authService.ts`:

```typescript
  async refreshToken(): Promise<string> {
    const response = await api.post<ApiResponse<{ token: string }>>('/auth/refresh');
    ...
  }
```

(the full method body — open the file to capture its exact extent).

At each call site (interceptor), replace the refresh-and-retry logic with a direct logout redirect:

```typescript
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
```

Preserve the surrounding interceptor structure; only the refresh attempt is replaced.

- [ ] **Step 3: Verify the frontend builds**

Run: `npm run build && npm run lint` (from `frontend/`)
Expected: build succeeds, lint clean (no unused-import warnings left behind).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/authService.ts frontend/src
git commit -m "fix(frontend): drop phantom /auth/refresh call, redirect to login on 401"
```

---

### Task 11: Full-suite verification & manual smoke

**Files:**
- None created. Verification only.

**Interfaces:**
- Consumes: everything above.
- Produces: evidence that Phase 0 exit criteria hold.

- [ ] **Step 1: Entire backend test suite**

Run: `./gradlew test` (from `api/`)
Expected: `BUILD SUCCESSFUL`, 0 failures — includes SecurityConfigTest, CheckoutDbServiceIntegrationTest (8 tests), RoleEnforcementIntegrationTest (3), RegistrationIntegrationTest (2).

- [ ] **Step 2: Manual smoke against a real Postgres**

```bash
docker run -d --name library-pg-smoke -e POSTGRES_DB=library_db -e POSTGRES_USER=library -e POSTGRES_PASSWORD=library -p 5432:5432 postgres:16-alpine
sleep 5
SPRING_PROFILES_ACTIVE=dev ./gradlew bootRun &
sleep 25
curl -sf http://localhost:8082/actuator/health   # {"status":"UP"}
curl -s -X POST http://localhost:8082/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin"}' | head -c 200
curl -s "http://localhost:8082/api/books/search?q=1984" | head -c 300
docker rm -f library-pg-smoke
```

Expected: health UP; login returns a `ResponseModel` with `success:true` and an `Authorization` header value echoed in body/header; search returns the seeded *1984*. (Seeded passwords are bcrypt hashes from the original sprint — if `admin/admin` fails, registration provides a working account: register then login.)

- [ ] **Step 3: Commit any straggler fixes**

```bash
git status --short   # should be clean; commit leftovers if the smoke exposed fixes
```

---

## Self-Review Record

1. **Spec coverage (§5.1 stabilization sprint):** legacy deletion → Task 1; `authenticationManager` fix → Task 2; JWT-principal identity replacing `X-User-Id` → Tasks 5 (renew) + 6; server-side roles → Task 7; registration + refresh removal → Tasks 8 + 10; audit wiring → Task 9; loan-rule tests → Task 5. Postgres conversion (D3 prerequisite for Testcontainers-PG per §4) → Task 3. ✔
2. **Placeholder scan:** Task 9 Steps 3-4 give exact insertion snippets; Task 10 gives exact replacement code; entity-constructor alignment fallbacks are bounded to unread files with fixed semantics. No TBDs. ✔
3. **Type consistency:** `renewIssue(RenewRequest, callerId: String, callerIsStaff: Boolean)` defined in Task 5 Step 2, used identically in Task 5 tests and Task 5 Step 3 controller. `logAction(userId: String?, action: String, entityType: String, entityId: String, details: String? = null)` matches `AuditLogDbService.kt:14`. `AbstractIntegrationTest` produced in Task 4, consumed in Tasks 5-9. ✔
