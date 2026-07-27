# Sprint 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade backend to Spring Boot 3 + Java 17, redesign DB schema with proper foreign keys and new tables, migrate security to modern patterns, scaffold React frontend with login.

**Architecture:** Upgrade existing Kotlin/Spring Boot backend in-place. Add Flyway for schema migrations. Create new entity classes with JPA relationships. Scaffold React 18 + Vite + TypeScript frontend in a `frontend/` directory. JWT auth migrated from `WebSecurityConfigurerAdapter` to `SecurityFilterChain`.

**Tech Stack:** Kotlin 1.9.x, Spring Boot 3.3.x, Java 17, Spring Security 6.x, Flyway, MySQL 8.x, React 18, Vite 5.x, TypeScript 5.x, Zustand, TanStack Query, React Router 6

## Global Constraints

- Java 17 (minimum)
- Spring Boot 3.3.x
- Kotlin 1.9.x
- MySQL 8.x
- All JPA imports use `jakarta.persistence.*` (not `javax.persistence.*`)
- UUID primary keys on all tables
- REST API base path: `/api/`
- JWT secret from environment variable `JWT_SECRET` (not hardcoded)
- Frontend port: 5173 (Vite default), Backend port: 8082

---

## File Structure

### Backend — Modified Files
```
api/pom.xml                                          — Upgrade Spring Boot, Java, Kotlin versions
api/src/main/resources/application.yml               — Add Flyway config, env-based JWT secret
api/src/main/kotlin/.../ApiApplication.kt            — Update Kotlin module registration
api/src/main/kotlin/.../security/SecurityConfiguration.kt  — Migrate to SecurityFilterChain
api/src/main/kotlin/.../security/JWTAuthenticationFilter.kt — Migrate javax → jakarta servlet
api/src/main/kotlin/.../security/JWTAuthorizationFilter.kt  — Migrate javax → jakarta servlet
api/src/main/kotlin/.../security/LibraryUserDetailService.kt — Add role from DB user
api/src/main/kotlin/.../security/LibraryUserPrincipal.java   — Convert to Kotlin, add role field
api/src/main/kotlin/.../security/SecurityHelper.kt           — No changes needed
api/src/main/kotlin/.../database/entity/BooksEntity.kt      — Add new fields, FK relationships
api/src/main/kotlin/.../database/entity/UserEntity.kt       — Add role, branch FK, membership type
api/src/main/kotlin/.../database/entity/BookIssueEntity.kt  — Add due_date, copy FK
api/src/main/kotlin/.../database/entity/LoginEntity.kt      — Add user_id FK, security fields
api/src/main/kotlin/.../models/BookModel.kt                 — Update request/response models
api/src/main/kotlin/.../models/UserModel.kt                 — Update request/response models
api/src/main/kotlin/.../models/LoginModel.kt                — Add role to LoginResponseModel
```

### Backend — New Files
```
api/src/main/resources/db/migration/V1__create_tables.sql          — All tables DDL
api/src/main/resources/db/migration/V2__seed_data.sql              — Seed data
api/src/main/kotlin/.../database/entity/BranchEntity.kt            — Branch entity + repository
api/src/main/kotlin/.../database/entity/BookCopyEntity.kt          — BookCopy entity + repository
api/src/main/kotlin/.../database/entity/CategoryEntity.kt          — Category entity + repository
api/src/main/kotlin/.../database/entity/BookReservationEntity.kt   — Reservation entity + repository
api/src/main/kotlin/.../database/entity/EmailLogEntity.kt          — Email log entity + repository
api/src/main/kotlin/.../database/entity/AuditLogEntity.kt          — Audit log entity + repository
api/src/main/kotlin/.../database/enums/UserRole.kt                 — ADMIN, LIBRARIAN, MEMBER enum
api/src/main/kotlin/.../database/enums/MembershipType.kt           — STUDENT, FACULTY, PUBLIC enum
api/src/main/kotlin/.../database/enums/CopyStatus.kt               — AVAILABLE, LOANED, LOST, DAMAGED
api/src/main/kotlin/.../database/enums/ReservationStatus.kt        — PENDING, READY, EXPIRED, CANCELLED, FULFILLED
api/src/main/kotlin/.../configuration/CorsConfig.kt                — CORS configuration
```

### Frontend — New Files
```
frontend/package.json
frontend/tsconfig.json
frontend/vite.config.ts
frontend/index.html
frontend/src/main.tsx
frontend/src/App.tsx
frontend/src/vite-env.d.ts
frontend/src/stores/authStore.ts           — Zustand auth store (token, user, role)
frontend/src/stores/themeStore.ts          — Zustand theme store
frontend/src/services/api.ts               — Axios instance with auth interceptor
frontend/src/services/authService.ts       — Login/logout API calls
frontend/src/pages/LoginPage.tsx           — Login form
frontend/src/pages/DashboardPage.tsx       — Placeholder dashboard
frontend/src/components/Layout.tsx         — Sidebar + header shell
frontend/src/components/ProtectedRoute.tsx — Route guard by role
frontend/src/types/index.ts                — TypeScript types
frontend/src/lib/utils.ts                  — cn() helper (clsx)
frontend/src/index.css                     — CSS custom properties (light/dark)
frontend/src/App.css                       — Layout styles
frontend/src/pages/LoginPage.css           — Login styles
```

---

### Task 1: Upgrade pom.xml to Spring Boot 3, Java 17, Kotlin 1.9

**Files:**
- Modify: `api/pom.xml`

- [ ] **Step 1: Update Spring Boot parent version**

Change `api/pom.xml` line 8:
```xml
<!-- BEFORE -->
<version>2.4.3</version>

<!-- AFTER -->
<version>3.3.5</version>
```

- [ ] **Step 2: Update Java version**

Change `api/pom.xml` line 17:
```xml
<!-- BEFORE -->
<java.version>11</java.version>
<kotlin.version>1.4.30</kotlin.version>

<!-- AFTER -->
<java.version>17</java.version>
<kotlin.version>1.9.25</kotlin.version>
```

- [ ] **Step 3: Replace mysql-connector-java with mysql-connector-j**

In `api/pom.xml`, replace lines 46-49:
```xml
<!-- BEFORE -->
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <version>8.0.19</version>
</dependency>

<!-- AFTER -->
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
```

- [ ] **Step 4: Add Flyway dependency**

Add after the MySQL dependency:
```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-mysql</artifactId>
</dependency>
```

- [ ] **Step 5: Remove duplicate java-jwt dependency**

The file has `java-jwt` listed twice (lines 51-54 and 56-59). Remove the second occurrence.

- [ ] **Step 6: Update kotlin-maven-allopen dependency version**

Change line 93:
```xml
<!-- BEFORE -->
<version>${kotlin.version}</version>

<!-- AFTER -->
<version>${kotlin.version}</version>
```
(This stays the same since we updated `kotlin.version` above.)

- [ ] **Step 7: Commit**

```bash
git add api/pom.xml
git commit -m "chore: upgrade to Spring Boot 3.3.5, Java 17, Kotlin 1.9.25, add Flyway"
```

---

### Task 2: Update application.yml for Spring Boot 3 and Flyway

**Files:**
- Modify: `api/src/main/resources/application.yml`

- [ ] **Step 1: Rewrite application.yml**

Replace the entire content of `api/src/main/resources/application.yml` with:

```yaml
spring:
  profiles:
    active: dev
  datasource:
    url: jdbc:mysql://localhost:3306/library_db?allowPublicKeyRetrieval=true&useSSL=false
    driverClassName: com.mysql.cj.jdbc.Driver
    username: root
    password: root
  jpa:
    hibernate:
      naming:
        physical-strategy: org.hibernate.boot.model.naming.PhysicalNamingStrategyStandardImpl
        implicit-strategy: org.hibernate.boot.model.naming.ImplicitNamingStrategyLegacyJpaImpl
    open-in-view: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true

qrcode-url: https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={qrCodeData}

server:
  port: 8082

jwt:
  url: /api/auth/login
  header: Authorization
  prefix: "Bearer "
  expiration: 60000000
  secret: ${JWT_SECRET:dev-jwt-secret-change-in-production}

logging:
  level:
    com.digihome.library.api: DEBUG
    org.springframework.security: DEBUG
```

- [ ] **Step 2: Create application-dev.yml for local development**

Create `api/src/main/resources/application-dev.yml`:
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/library_db?allowPublicKeyRetrieval=true&useSSL=false
    username: root
    password: root
```

- [ ] **Step 3: Create application-prod.yml placeholder**

Create `api/src/main/resources/application-prod.yml`:
```yaml
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}

jwt:
  secret: ${JWT_SECRET}
```

- [ ] **Step 4: Commit**

```bash
git add api/src/main/resources/
git commit -m "chore: update application.yml for Spring Boot 3, add Flyway config"
```

---

### Task 3: Create database enums

**Files:**
- Create: `api/src/main/kotlin/com/digihome/library/api/database/enums/UserRole.kt`
- Create: `api/src/main/kotlin/com/digihome/library/api/database/enums/MembershipType.kt`
- Create: `api/src/main/kotlin/com/digihome/library/api/database/enums/CopyStatus.kt`
- Create: `api/src/main/kotlin/com/digihome/library/api/database/enums/ReservationStatus.kt`

- [ ] **Step 1: Create UserRole enum**

```kotlin
package com.digihome.library.api.database.enums

enum class UserRole {
    ADMIN,
    LIBRARIAN,
    MEMBER
}
```

- [ ] **Step 2: Create MembershipType enum**

```kotlin
package com.digihome.library.api.database.enums

enum class MembershipType {
    STUDENT,
    FACULTY,
    PUBLIC
}
```

- [ ] **Step 3: Create CopyStatus enum**

```kotlin
package com.digihome.library.api.database.enums

enum class CopyStatus {
    AVAILABLE,
    LOANED,
    LOST,
    DAMAGED
}
```

- [ ] **Step 4: Create ReservationStatus enum**

```kotlin
package com.digihome.library.api.database.enums

enum class ReservationStatus {
    PENDING,
    READY,
    EXPIRED,
    CANCELLED,
    FULFILLED
}
```

- [ ] **Step 5: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/database/enums/
git commit -m "feat: add database enums for UserRole, MembershipType, CopyStatus, ReservationStatus"
```

---

### Task 4: Create new entity classes with JPA relationships

**Files:**
- Create: `api/src/main/kotlin/com/digihome/library/api/database/entity/BranchEntity.kt`
- Create: `api/src/main/kotlin/com/digihome/library/api/database/entity/BookCopyEntity.kt`
- Create: `api/src/main/kotlin/com/digihome/library/api/database/entity/CategoryEntity.kt`
- Create: `api/src/main/kotlin/com/digihome/library/api/database/entity/BookReservationEntity.kt`
- Create: `api/src/main/kotlin/com/digihome/library/api/database/entity/EmailLogEntity.kt`
- Create: `api/src/main/kotlin/com/digihome/library/api/database/entity/AuditLogEntity.kt`

- [ ] **Step 1: Create BranchEntity**

```kotlin
package com.digihome.library.api.database.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "branch")
class BranchEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    var name: String = "",

    var address: String = "",

    var phone: String = "",

    var email: String = "",

    @CreationTimestamp
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

interface BranchRepository : JpaRepository<BranchEntity, String>
```

- [ ] **Step 2: Create CategoryEntity**

```kotlin
package com.digihome.library.api.database.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "category")
class CategoryEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    var name: String = "",

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    var parent: CategoryEntity? = null,

    @CreationTimestamp
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

interface CategoryRepository : JpaRepository<CategoryEntity, String> {
    fun findByName(name: String): CategoryEntity?
}
```

- [ ] **Step 3: Create BookCopyEntity**

```kotlin
package com.digihome.library.api.database.entity

import com.digihome.library.api.database.enums.CopyStatus
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "book_copies")
class BookCopyEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    var book: BooksEntity? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    var branch: BranchEntity? = null,

    var barcode: String = "",

    @Enumerated(EnumType.STRING)
    var status: CopyStatus = CopyStatus.AVAILABLE,

    @CreationTimestamp
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

interface BookCopyRepository : JpaRepository<BookCopyEntity, String> {
    fun findByBookId(bookId: String): List<BookCopyEntity>
    fun findByBookIdAndBranchId(bookId: String, branchId: String): List<BookCopyEntity>
    fun findByBarcode(barcode: String): BookCopyEntity?
    fun countByBookIdAndStatus(bookId: String, status: CopyStatus): Long
}
```

- [ ] **Step 4: Create BookReservationEntity**

```kotlin
package com.digihome.library.api.database.entity

import com.digihome.library.api.database.enums.ReservationStatus
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "book_reservation")
class BookReservationEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    var book: BooksEntity? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    var branch: BranchEntity? = null,

    @Enumerated(EnumType.STRING)
    var status: ReservationStatus = ReservationStatus.PENDING,

    var queuePosition: Int = 0,

    @CreationTimestamp
    var reservedAt: LocalDateTime = LocalDateTime.now(),

    var notifiedAt: LocalDateTime? = null,

    var expiresAt: LocalDateTime? = null,

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

interface BookReservationRepository : JpaRepository<BookReservationEntity, String> {
    fun findByBookIdAndStatusOrderByQueuePositionAsc(bookId: String, status: ReservationStatus): List<BookReservationEntity>
    fun findByUserIdAndStatusIn(userId: String, statuses: List<ReservationStatus>): List<BookReservationEntity>
}
```

- [ ] **Step 5: Create EmailLogEntity**

```kotlin
package com.digihome.library.api.database.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "email_log")
class EmailLogEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity? = null,

    var emailType: String = "",

    var subject: String = "",

    @CreationTimestamp
    var sentAt: LocalDateTime = LocalDateTime.now(),

    var status: String = "SENT",

    @Column(columnDefinition = "TEXT")
    var errorMessage: String? = null
)

interface EmailLogRepository : JpaRepository<EmailLogEntity, String>
```

- [ ] **Step 6: Create AuditLogEntity**

```kotlin
package com.digihome.library.api.database.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "audit_log")
class AuditLogEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    var user: UserEntity? = null,

    var action: String = "",

    var entityType: String = "",

    var entityId: String = "",

    @Column(columnDefinition = "JSON")
    var details: String? = null,

    @CreationTimestamp
    var createdAt: LocalDateTime = LocalDateTime.now()
)

interface AuditLogRepository : JpaRepository<AuditLogEntity, String>
```

- [ ] **Step 7: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/database/entity/BranchEntity.kt \
        api/src/main/kotlin/com/digihome/library/api/database/entity/CategoryEntity.kt \
        api/src/main/kotlin/com/digihome/library/api/database/entity/BookCopyEntity.kt \
        api/src/main/kotlin/com/digihome/library/api/database/entity/BookReservationEntity.kt \
        api/src/main/kotlin/com/digihome/library/api/database/entity/EmailLogEntity.kt \
        api/src/main/kotlin/com/digihome/library/api/database/entity/AuditLogEntity.kt
git commit -m "feat: add Branch, Category, BookCopy, Reservation, EmailLog, AuditLog entities"
```

---

### Task 5: Update existing entities with new fields and Jakarta imports

**Files:**
- Modify: `api/src/main/kotlin/com/digihome/library/api/database/entity/BooksEntity.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/database/entity/UserEntity.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/database/entity/BookIssueEntity.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/database/entity/LoginEntity.kt`

- [ ] **Step 1: Rewrite BooksEntity with new fields**

Replace entire `api/src/main/kotlin/com/digihome/library/api/database/entity/BooksEntity.kt`:

```kotlin
package com.digihome.library.api.database.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "books")
class BooksEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    var isbn: String = "",

    var bookName: String = "",

    var author: String = "",

    var publication: String = "",

    var language: String = "",

    var location: String = "",

    @Column(columnDefinition = "TEXT")
    var description: String = "",

    var coverImageUrl: String = "",

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    var category: CategoryEntity? = null,

    @CreationTimestamp
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

interface BooksRepository : JpaRepository<BooksEntity, String> {
    fun findAllByOrderByCreatedAtDesc(): List<BooksEntity>?
    fun findByLanguageOrderByBookNameAsc(language: String): List<BooksEntity>?
    fun findByBookNameContainingIgnoreCaseOrAuthorContainingIgnoreCaseOrIsbnContaining(
        bookName: String, author: String, isbn: String
    ): List<BooksEntity>
}
```

- [ ] **Step 2: Rewrite UserEntity with role, branch, membership type**

Replace entire `api/src/main/kotlin/com/digihome/library/api/database/entity/UserEntity.kt`:

```kotlin
package com.digihome.library.api.database.entity

import com.digihome.library.api.database.enums.MembershipType
import com.digihome.library.api.database.enums.UserRole
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "user")
class UserEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    var membershipId: String = "",

    var firstName: String = "",

    var lastName: String = "",

    var phoneNumber: String = "",

    var emailId: String = "",

    @Enumerated(EnumType.STRING)
    var role: UserRole = UserRole.MEMBER,

    @Enumerated(EnumType.STRING)
    var membershipType: MembershipType = MembershipType.PUBLIC,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    var branch: BranchEntity? = null,

    var isActive: Boolean = true,

    var createdBy: String = "",

    @CreationTimestamp
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

interface UserRepository : JpaRepository<UserEntity, String> {
    fun findByPhoneNumber(phoneNumber: String): UserEntity?
    fun findByEmailId(emailId: String): UserEntity?
    fun findByRole(role: com.digihome.library.api.database.enums.UserRole): List<UserEntity>
}
```

- [ ] **Step 3: Rewrite BookIssueEntity with due_date and copy FK**

Replace entire `api/src/main/kotlin/com/digihome/library/api/database/entity/BookIssueEntity.kt`:

```kotlin
package com.digihome.library.api.database.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "book_issue")
data class BookIssueEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "copy_id", nullable = false)
    var copy: BookCopyEntity? = null,

    @CreationTimestamp
    var issueDate: LocalDateTime = LocalDateTime.now(),

    var dueDate: LocalDateTime = LocalDateTime.now().plusDays(21),

    var returnDate: LocalDateTime? = null,

    var renewed: Boolean = false,

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

interface BookIssueRepository : JpaRepository<BookIssueEntity, String> {
    fun findByUserIdAndReturnDateIsNull(userId: String): List<BookIssueEntity>
    fun findByCopyIdAndReturnDateIsNull(copyId: String): BookIssueEntity?
    fun countByUserIdAndReturnDateIsNull(userId: String): Long
}
```

- [ ] **Step 4: Rewrite LoginEntity with user FK and security fields**

Replace entire `api/src/main/kotlin/com/digihome/library/api/database/entity/LoginEntity.kt`:

```kotlin
package com.digihome.library.api.database.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "login")
class LoginEntity(
    @Id
    var id: String = UUID.randomUUID().toString(),

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    var user: UserEntity? = null,

    var username: String = "",

    var password: String = "",

    var isLocked: Boolean = false,

    var failedAttempts: Int = 0,

    @CreationTimestamp
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @UpdateTimestamp
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

interface LoginRepository : JpaRepository<LoginEntity, String> {
    fun findByUsername(username: String): LoginEntity?
}
```

- [ ] **Step 5: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/database/entity/
git commit -m "refactor: update entities with Jakarta imports, FK relationships, new fields"
```

---

### Task 6: Create Flyway migration scripts

**Files:**
- Create: `api/src/main/resources/db/migration/V1__create_tables.sql`
- Create: `api/src/main/resources/db/migration/V2__seed_data.sql`

- [ ] **Step 1: Create V1__create_tables.sql**

```sql
-- Branch table
CREATE TABLE IF NOT EXISTS branch (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Category table (self-referencing for hierarchy)
CREATE TABLE IF NOT EXISTS category (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES category(id) ON DELETE SET NULL
);

-- Books table
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE SET NULL
);

-- Book copies table (individual physical copies with barcodes)
CREATE TABLE IF NOT EXISTS book_copies (
    id VARCHAR(36) PRIMARY KEY,
    book_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36) NOT NULL,
    barcode VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('AVAILABLE', 'LOANED', 'LOST', 'DAMAGED') DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE CASCADE
);

-- User table
CREATE TABLE IF NOT EXISTS user (
    id VARCHAR(36) PRIMARY KEY,
    membership_id VARCHAR(20) DEFAULT '',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email_id VARCHAR(100) DEFAULT '',
    role ENUM('ADMIN', 'LIBRARIAN', 'MEMBER') DEFAULT 'MEMBER',
    membership_type ENUM('STUDENT', 'FACULTY', 'PUBLIC') DEFAULT 'PUBLIC',
    branch_id VARCHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE SET NULL
);

-- Login table (auth credentials)
CREATE TABLE IF NOT EXISTS login (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    failed_attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Book issue table (checkout/return tracking)
CREATE TABLE IF NOT EXISTS book_issue (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    copy_id VARCHAR(36) NOT NULL,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    return_date TIMESTAMP NULL,
    renewed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (copy_id) REFERENCES book_copies(id) ON DELETE CASCADE
);

-- Book reservation table
CREATE TABLE IF NOT EXISTS book_reservation (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    book_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36) NOT NULL,
    status ENUM('PENDING', 'READY', 'EXPIRED', 'CANCELLED', 'FULFILLED') DEFAULT 'PENDING',
    queue_position INT DEFAULT 0,
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notified_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE CASCADE
);

-- Email log table
CREATE TABLE IF NOT EXISTS email_log (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    email_type VARCHAR(50) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('SENT', 'FAILED') DEFAULT 'SENT',
    error_message TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_book_name ON books(book_name);
CREATE INDEX idx_book_copies_book_id ON book_copies(book_id);
CREATE INDEX idx_book_copies_branch_id ON book_copies(branch_id);
CREATE INDEX idx_book_copies_barcode ON book_copies(barcode);
CREATE INDEX idx_user_phone_number ON user(phone_number);
CREATE INDEX idx_user_email_id ON user(email_id);
CREATE INDEX idx_user_role ON user(role);
CREATE INDEX idx_login_username ON login(username);
CREATE INDEX idx_book_issue_user_id ON book_issue(user_id);
CREATE INDEX idx_book_issue_copy_id ON book_issue(copy_id);
CREATE INDEX idx_book_issue_due_date ON book_issue(due_date);
CREATE INDEX idx_book_reservation_user_id ON book_reservation(user_id);
CREATE INDEX idx_book_reservation_book_id ON book_reservation(book_id);
CREATE INDEX idx_book_reservation_status ON book_reservation(status);
```

- [ ] **Step 2: Create V2__seed_data.sql**

```sql
-- Seed branches
INSERT INTO branch (id, name, address, phone, email) VALUES
('b0000001-0000-0000-0000-000000000001', 'Central Library', '123 Main Street, Toronto, ON M5V 2T6', '+1-416-555-0101', 'central@library.com'),
('b0000001-0000-0000-0000-000000000002', 'North Branch', '456 North Ave, Toronto, ON M2N 1A1', '+1-416-555-0102', 'north@library.com'),
('b0000001-0000-0000-0000-000000000003', 'East Branch', '789 East Blvd, Scarborough, ON M1N 2B2', '+1-416-555-0103', 'east@library.com');

-- Seed categories
INSERT INTO category (id, name, parent_id) VALUES
('c0000001-0000-0000-0000-000000000001', 'Fiction', NULL),
('c0000001-0000-0000-0000-000000000002', 'Science Fiction', 'c0000001-0000-0000-0000-000000000001'),
('c0000001-0000-0000-0000-000000000003', 'Fantasy', 'c0000001-0000-0000-0000-000000000001'),
('c0000001-0000-0000-0000-000000000004', 'Non-Fiction', NULL),
('c0000001-0000-0000-0000-000000000005', 'Science', 'c0000001-0000-0000-0000-000000000004'),
('c0000001-0000-0000-0000-000000000006', 'History', 'c0000001-0000-0000-0000-000000000004'),
('c0000001-0000-0000-0000-000000000007', 'Technology', 'c0000001-0000-0000-0000-000000000004');

-- Seed admin user
INSERT INTO user (id, membership_id, first_name, last_name, phone_number, email_id, role, membership_type, branch_id, is_active, created_by) VALUES
('u0000001-0000-0000-0000-000000000001', 'ADM001', 'Admin', 'User', '+1-416-555-1000', 'admin@library.com', 'ADMIN', 'PUBLIC', 'b0000001-0000-0000-0000-000000000001', TRUE, 'system');

-- Seed admin login (password: admin123 - BCrypt hash)
INSERT INTO login (id, user_id, username, password) VALUES
('l0000001-0000-0000-0000-000000000001', 'u0000001-0000-0000-0000-000000000001', 'admin', '$2a$09$W7yBzGxPzGxPzGxPzGxPzOeKzGxPzGxPzGxPzGxPzGxPzGxPzGx');

-- Seed librarian user
INSERT INTO user (id, membership_id, first_name, last_name, phone_number, email_id, role, membership_type, branch_id, is_active, created_by) VALUES
('u0000001-0000-0000-0000-000000000002', 'LIB001', 'Jane', 'Librarian', '+1-416-555-1001', 'jane@library.com', 'LIBRARIAN', 'PUBLIC', 'b0000001-0000-0000-0000-000000000001', TRUE, 'u0000001-0000-0000-0000-000000000001');

INSERT INTO login (id, user_id, username, password) VALUES
('l0000001-0000-0000-0000-000000000002', 'u0000001-0000-0000-0000-000000000002', 'jane', '$2a$09$W7yBzGxPzGxPzGxPzGxPzOeKzGxPzGxPzGxPzGxPzGxPzGxPzGx');

-- Seed member user
INSERT INTO user (id, membership_id, first_name, last_name, phone_number, email_id, role, membership_type, branch_id, is_active, created_by) VALUES
('u0000001-0000-0000-0000-000000000003', 'MEM001', 'John', 'Member', '+1-416-555-1002', 'john@example.com', 'MEMBER', 'STUDENT', 'b0000001-0000-0000-0000-000000000001', TRUE, 'u0000001-0000-0000-0000-000000000001');

INSERT INTO login (id, user_id, username, password) VALUES
('l0000001-0000-0000-0000-000000000003', 'u0000001-0000-0000-0000-000000000003', 'john', '$2a$09$W7yBzGxPzGxPzGxPzGxPzOeKzGxPzGxPzGxPzGxPzGxPzGxPzGx');

-- Seed sample books
INSERT INTO books (id, isbn, book_name, author, publication, language, location, description, category_id) VALUES
('bk000001-0000-0000-0000-000000000001', '9780451524935', '1984', 'George Orwell', 'Signet Classics', 'English', 'Shelf A1', 'A dystopian social science fiction novel', 'c0000001-0000-0000-0000-000000000002'),
('bk000001-0000-0000-0000-000000000002', '9780061120084', 'To Kill a Mockingbird', 'Harper Lee', 'Harper Perennial', 'English', 'Shelf A2', 'A novel about racial injustice in the American South', 'c0000001-0000-0000-0000-000000000001'),
('bk000001-0000-0000-0000-000000000003', '9780547928227', 'The Hobbit', 'J.R.R. Tolkien', 'Mariner Books', 'English', 'Shelf B1', 'A fantasy novel about the adventures of Bilbo Baggins', 'c0000001-0000-0000-0000-000000000003'),
('bk000001-0000-0000-0000-000000000004', '9780134685991', 'Effective Java', 'Joshua Bloch', 'Addison-Wesley', 'English', 'Shelf C1', 'Best practices for the Java platform', 'c0000001-0000-0000-0000-000000000007'),
('bk000001-0000-0000-0000-000000000005', '9780060935467', 'A Brief History of Time', 'Stephen Hawking', 'Bantam', 'English', 'Shelf D1', 'A landmark volume in science writing', 'c0000001-0000-0000-0000-000000000005');

-- Seed book copies for Central Library
INSERT INTO book_copies (id, book_id, branch_id, barcode, status) VALUES
('cp000001-0000-0000-0000-000000000001', 'bk000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'CL-001-001', 'AVAILABLE'),
('cp000001-0000-0000-0000-000000000002', 'bk000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'CL-001-002', 'AVAILABLE'),
('cp000001-0000-0000-0000-000000000003', 'bk000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 'CL-002-001', 'AVAILABLE'),
('cp000001-0000-0000-0000-000000000004', 'bk000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000001', 'CL-003-001', 'AVAILABLE'),
('cp000001-0000-0000-0000-000000000005', 'bk000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000001', 'CL-004-001', 'AVAILABLE'),
('cp000001-0000-0000-0000-000000000006', 'bk000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000001', 'CL-005-001', 'AVAILABLE');

-- Seed book copies for North Branch
INSERT INTO book_copies (id, book_id, branch_id, barcode, status) VALUES
('cp000001-0000-0000-0000-000000000007', 'bk000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000002', 'NB-001-001', 'AVAILABLE'),
('cp000001-0000-0000-0000-000000000008', 'bk000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000002', 'NB-003-001', 'AVAILABLE');
```

- [ ] **Step 3: Commit**

```bash
git add api/src/main/resources/db/
git commit -m "feat: add Flyway migration scripts with schema and seed data"
```

---

### Task 7: Migrate security to Spring Boot 3 patterns

**Files:**
- Create: `api/src/main/kotlin/com/digihome/library/api/configuration/CorsConfig.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/security/SecurityConfiguration.kt`
- Replace: `api/src/main/kotlin/com/digihome/library/api/security/LibraryUserPrincipal.java` → convert to Kotlin
- Modify: `api/src/main/kotlin/com/digihome/library/api/security/LibraryUserDetailService.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/security/JWTAuthenticationFilter.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/security/JWTAuthorizationFilter.kt`

- [ ] **Step 1: Create CorsConfig**

Create `api/src/main/kotlin/com/digihome/library/api/configuration/CorsConfig.kt`:

```kotlin
package com.digihome.library.api.configuration

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import org.springframework.web.filter.CorsFilter

@Configuration
class CorsConfig {

    @Bean
    fun corsFilter(): CorsFilter {
        val config = CorsConfiguration().apply {
            allowedOrigins = listOf("http://localhost:5173", "http://localhost:3000")
            allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
            allowedHeaders = listOf("*")
            allowCredentials = true
            maxAge = 3600L
        }
        val source = UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", config)
        }
        return CorsFilter(source)
    }
}
```

- [ ] **Step 2: Delete LibraryUserPrincipal.java**

```bash
rm api/src/main/kotlin/com/digihome/library/api/security/LibraryUserPrincipal.java
```

- [ ] **Step 3: Create LibraryUserPrincipal.kt (Kotlin rewrite)**

Create `api/src/main/kotlin/com/digihome/library/api/security/LibraryUserPrincipal.kt`:

```kotlin
package com.digihome.library.api.security

import com.fasterxml.jackson.databind.annotation.JsonDeserialize
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails

class LibraryUserPrincipal(
    val id: String,
    private val _username: String,
    private val _password: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val role: String,
    @JsonDeserialize(contentUsing = SimpleGrantedAuthorityDeserializer::class)
    private val _authorities: Collection<GrantedAuthority>
) : UserDetails {

    override fun getUsername(): String = _username
    override fun getPassword(): String = _password
    override fun getAuthorities(): Collection<GrantedAuthority> = _authorities
    override fun isAccountNonExpired(): Boolean = true
    override fun isAccountNonLocked(): Boolean = true
    override fun isCredentialsNonExpired(): Boolean = true
    override fun isEnabled(): Boolean = true
}
```

- [ ] **Step 4: Create SimpleGrantedAuthorityDeserializer.kt**

Create `api/src/main/kotlin/com/digihome/library/api/security/SimpleGrantedAuthorityDeserializer.kt`:

```kotlin
package com.digihome.library.api.security

import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.databind.DeserializationContext
import com.fasterxml.jackson.databind.JsonDeserializer
import com.fasterxml.jackson.databind.JsonNode
import org.springframework.security.core.authority.SimpleGrantedAuthority
import java.io.IOException

class SimpleGrantedAuthorityDeserializer : JsonDeserializer<SimpleGrantedAuthority>() {
    @Throws(IOException::class)
    override fun deserialize(p: JsonParser, ctxt: DeserializationContext): SimpleGrantedAuthority {
        val tree: JsonNode = p.codec.readTree(p)
        return SimpleGrantedAuthority(tree.get("authority").textValue())
    }
}
```

- [ ] **Step 5: Rewrite SecurityConfiguration.kt with SecurityFilterChain**

Replace entire `api/src/main/kotlin/com/digihome/library/api/security/SecurityConfiguration.kt`:

```kotlin
package com.digihome.library.api.security

import com.digihome.library.api.configuration.JwtConfig
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.web.SecurityFilterChain

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
class SecurityConfig(
    val libraryUserDetailService: LibraryUserDetailService,
    val jwtConfig: JwtConfig,
    val objectMapper: ObjectMapper
) {

    val logger = LoggerFactory.getLogger(this::class.java)

    @Bean
    fun passwordEncoder(): BCryptPasswordEncoder = BCryptPasswordEncoder(9)

    @Bean
    fun authenticationManager(authConfig: AuthenticationConfiguration): AuthenticationManager =
        authConfig.authenticationManager

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
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
                    .anyRequest().authenticated()
            }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .addFilter(
                JWTAuthenticationFilter(authenticationManager(null), jwtConfig, objectMapper)
            )
            .addFilter(
                JWTAuthorizationFilter(authenticationManager(null), jwtConfig, objectMapper)
            )

        return http.build()
    }
}
```

- [ ] **Step 6: Rewrite LibraryUserDetailService.kt to load role from DB**

Replace entire `api/src/main/kotlin/com/digihome/library/api/security/LibraryUserDetailService.kt`:

```kotlin
package com.digihome.library.api.security

import com.digihome.library.api.database.entity.LoginRepository
import org.slf4j.LoggerFactory
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

@Service
class LibraryUserDetailService(val loginRepository: LoginRepository) : UserDetailsService {

    val logger = LoggerFactory.getLogger(this::class.java)

    override fun loadUserByUsername(username: String): UserDetails {
        val login = loginRepository.findByUsername(username)
            ?: run {
                logger.error("Username = $username does not exist in DB")
                throw UsernameNotFoundException("Username = $username does not exist in DB")
            }

        val user = login.user
            ?: throw UsernameNotFoundException("User record not linked for username = $username")

        val authorities = setOf(SimpleGrantedAuthority("ROLE_${user.role.name}"))

        return LibraryUserPrincipal(
            id = user.id,
            _username = login.username,
            _password = login.password,
            firstName = user.firstName,
            lastName = user.lastName,
            email = user.emailId,
            role = user.role.name,
            _authorities = authorities
        )
    }
}
```

- [ ] **Step 7: Rewrite JWTAuthenticationFilter.kt with Jakarta imports**

Replace entire `api/src/main/kotlin/com/digihome/library/api/security/JWTAuthenticationFilter.kt`:

```kotlin
package com.digihome.library.api.security

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm.HMAC512
import com.digihome.library.api.configuration.JwtConfig
import com.digihome.library.api.models.LoginModel
import com.digihome.library.api.models.LoginResponseModel
import com.digihome.library.api.models.ResponseModel
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import java.io.IOException
import java.util.*

class JWTAuthenticationFilter(
    val authManager: AuthenticationManager,
    val jwtConfig: JwtConfig,
    val objectMapper: ObjectMapper
) : UsernamePasswordAuthenticationFilter() {

    @Throws(AuthenticationException::class)
    override fun attemptAuthentication(req: HttpServletRequest, res: HttpServletResponse?): Authentication? {
        return try {
            val loginModel: LoginModel = ObjectMapper().readValue(req.inputStream, LoginModel::class.java)
            authManager.authenticate(
                UsernamePasswordAuthenticationToken(
                    loginModel.username,
                    loginModel.password,
                    ArrayList()
                )
            )
        } catch (e: IOException) {
            throw RuntimeException(e)
        }
    }

    @Throws(IOException::class)
    override fun successfulAuthentication(
        req: HttpServletRequest?,
        res: HttpServletResponse,
        chain: FilterChain?,
        auth: Authentication
    ) {
        val principal = auth.principal as LibraryUserPrincipal
        val loginResponseModel = LoginResponseModel(
            id = principal.id,
            firstName = principal.firstName,
            lastName = principal.lastName,
            role = principal.role,
            email = principal.email
        )
        val responseModel = ResponseModel(message = "Login successful", data = loginResponseModel)
        val responseModelJson = objectMapper.writeValueAsString(responseModel)

        val token: String = JWT.create()
            .withSubject(principal.id)
            .withClaim("username", principal.username)
            .withClaim("role", principal.role)
            .withExpiresAt(Date(System.currentTimeMillis() + jwtConfig.expiration))
            .sign(HMAC512(jwtConfig.secret))

        res.addHeader(jwtConfig.header, jwtConfig.prefix + token)
        res.contentType = "application/json"
        res.characterEncoding = "UTF-8"
        res.writer.write(responseModelJson)
        res.writer.flush()
        res.writer.close()
    }
}
```

- [ ] **Step 8: Rewrite JWTAuthorizationFilter.kt with Jakarta imports**

Replace entire `api/src/main/kotlin/com/digihome/library/api/security/JWTAuthorizationFilter.kt`:

```kotlin
package com.digihome.library.api.security

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.digihome.library.api.configuration.JwtConfig
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter

class JWTAuthorizationFilter(
    authManager: AuthenticationManager,
    val jwtConfig: JwtConfig,
    val objectMapper: ObjectMapper
) : BasicAuthenticationFilter(authManager) {

    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, chain: FilterChain) {
        val header = request.getHeader(jwtConfig.header)
        if (header == null || !header.startsWith(jwtConfig.prefix)) {
            chain.doFilter(request, response)
            return
        }
        val authentication = getAuthentication(request)
        if (authentication != null) {
            SecurityContextHolder.getContext().authentication = authentication
        }
        chain.doFilter(request, response)
    }

    private fun getAuthentication(request: HttpServletRequest): UsernamePasswordAuthenticationToken? {
        val token = request.getHeader(jwtConfig.header) ?: return null
        val tokenValue = token.removePrefix(jwtConfig.prefix).trim()

        return try {
            val decoded = JWT.require(Algorithm.HMAC512(jwtConfig.secret))
                .build()
                .verify(tokenValue)

            val userId = decoded.subject
            val username = decoded.getClaim("username").asString()
            val role = decoded.getClaim("role").asString()

            val authorities = listOf(SimpleGrantedAuthority("ROLE_$role"))
            UsernamePasswordAuthenticationToken(userId, null, authorities)
        } catch (e: Exception) {
            null
        }
    }
}
```

- [ ] **Step 9: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/security/ \
        api/src/main/kotlin/com/digihome/library/api/configuration/CorsConfig.kt
git rm api/src/main/kotlin/com/digihome/library/api/security/LibraryUserPrincipal.java
git commit -m "feat: migrate security to Spring Boot 3 SecurityFilterChain + Jakarta servlet API"
```

---

### Task 8: Update API models for new fields

**Files:**
- Modify: `api/src/main/kotlin/com/digihome/library/api/models/BookModel.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/models/UserModel.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/models/LoginModel.kt`
- Modify: `api/src/main/kotlin/com/digihome/library/api/models/ResponseModel.kt`

- [ ] **Step 1: Rewrite BookModel.kt**

Replace entire `api/src/main/kotlin/com/digihome/library/api/models/BookModel.kt`:

```kotlin
package com.digihome.library.api.models

data class AddBookModel(
    var isbn: String = "",
    var bookName: String = "",
    var author: String = "",
    var publication: String = "",
    var language: String = "",
    var location: String = "",
    var description: String = "",
    var coverImageUrl: String = "",
    var categoryId: String? = null
)

data class BookIssueModel(
    var userId: String = "",
    var bookId: String = "",
    var copyId: String = ""
)

data class BookFilterModel(
    var language: String = "",
    var page: Int = 1
)
```

- [ ] **Step 2: Rewrite UserModel.kt**

Replace entire `api/src/main/kotlin/com/digihome/library/api/models/UserModel.kt`:

```kotlin
package com.digihome.library.api.models

data class AddUserModel(
    var membershipId: String = "",
    var firstName: String = "",
    var lastName: String = "",
    var phoneNumber: String = "",
    var emailId: String = "",
    var role: String = "MEMBER",
    var membershipType: String = "PUBLIC",
    var branchId: String? = null
)
```

- [ ] **Step 3: Update LoginModel.kt with role in response**

Replace entire `api/src/main/kotlin/com/digihome/library/api/models/LoginModel.kt`:

```kotlin
package com.digihome.library.api.models

data class LoginModel(
    val username: String = "",
    val password: String = ""
)

data class LoginResponseModel(
    val id: String = "",
    val firstName: String? = null,
    val lastName: String? = null,
    val role: String? = null,
    val email: String? = null
)
```

- [ ] **Step 4: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/models/
git commit -m "feat: update API models with new fields for Sprint 1 entities"
```

---

### Task 9: Update ApiApplication.kt for Spring Boot 3

**Files:**
- Modify: `api/src/main/kotlin/com/digihome/library/api/ApiApplication.kt`

- [ ] **Step 1: Remove deprecated Jackson configuration**

The `KotlinModule()` constructor is deprecated in newer Jackson versions. Replace the `mapper()` bean:

```kotlin
package com.digihome.library.api

import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.kotlinModule
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.annotation.Bean
import org.springframework.data.jpa.repository.config.EnableJpaRepositories
import org.springframework.http.converter.ByteArrayHttpMessageConverter
import org.springframework.http.converter.HttpMessageConverter
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.web.client.RestTemplate
import java.text.SimpleDateFormat
import java.util.*

@SpringBootApplication
@EnableJpaRepositories
class ApiApplication {

    val logger = LoggerFactory.getLogger(this::class.java)

    @Bean
    fun mapper(): ObjectMapper {
        return ObjectMapper().apply {
            configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
            configure(DeserializationFeature.ACCEPT_EMPTY_ARRAY_AS_NULL_OBJECT, true)
            configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            configure(DeserializationFeature.READ_DATE_TIMESTAMPS_AS_NANOSECONDS, false)
            registerModule(kotlinModule())
            registerModule(JavaTimeModule())
            dateFormat = SimpleDateFormat("yyyy-MM-dd")
            setTimeZone(TimeZone.getTimeZone("America/Toronto"))
        }
    }

    @Bean
    fun restTemplate(messageConverters: List<HttpMessageConverter<*>?>?): RestTemplate {
        return RestTemplate(messageConverters!!)
    }

    @Bean
    fun byteArrayHttpMessageConverter(): ByteArrayHttpMessageConverter {
        return ByteArrayHttpMessageConverter()
    }
}

fun main(args: Array<String>) {
    runApplication<ApiApplication>(*args)
}
```

Note: Removed the `passwordEncoder()` bean since it's now defined in `SecurityConfig`.

- [ ] **Step 2: Commit**

```bash
git add api/src/main/kotlin/com/digihome/library/api/ApiApplication.kt
git commit -m "fix: update ApiApplication for Spring Boot 3 compatibility"
```

---

### Task 10: Verify backend compiles and starts

- [ ] **Step 1: Install Java 17 if needed**

```bash
java -version
```

Verify Java 17+ is installed. If not, install via SDKMAN or package manager.

- [ ] **Step 2: Create local MySQL database**

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS library_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

- [ ] **Step 3: Compile the project**

```bash
cd api && ./mvnw clean compile
```

Expected: BUILD SUCCESS. If there are errors, fix compilation issues before proceeding.

- [ ] **Step 4: Run the application**

```bash
cd api && ./mvnw spring-boot:run
```

Expected: Application starts on port 8082. Flyway migrations run. Verify by checking logs for:
- `Flyway: Successfully applied 2 migrations`
- `Started ApiApplication`

- [ ] **Step 5: Test login endpoint**

```bash
curl -X POST http://localhost:8082/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Note: The seed data BCrypt hashes need to be regenerated. See Task 11.

- [ ] **Step 6: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: resolve compilation issues for Spring Boot 3 upgrade"
```

---

### Task 11: Generate valid BCrypt hashes for seed data

The BCrypt hashes in V2__seed_data.sql are placeholders. They need real hashes.

- [ ] **Step 1: Generate BCrypt hash for 'admin123'**

```bash
cd api
./mvnw -q exec:java -Dexec.mainClass="org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder" -Dexec.classpathScope=compile -Dexec.args="admin123" 2>/dev/null || \
java -cp target/classes:$(find ~/.m2 -name 'spring-security-crypto-*.jar' | head -1) \
  -e 'import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder; System.out.println(new BCryptPasswordEncoder(9).encode("admin123"));'
```

Alternatively, use a quick Kotlin script or online tool. The hash format must be `$2a$09$...`.

- [ ] **Step 2: Update V2__seed_data.sql with real hash**

Replace all three placeholder hashes (for admin, jane, john) with the generated hash for their respective passwords.

For simplicity, use the same password `password123` for all seed users, and generate one hash for it.

- [ ] **Step 3: Drop and recreate database for clean migration**

```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS library_db; CREATE DATABASE library_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

- [ ] **Step 4: Restart application and verify**

```bash
cd api && ./mvnw spring-boot:run
```

Then test login:
```bash
curl -X POST http://localhost:8082/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Expected: 200 OK with JWT token in Authorization header and user data in body.

- [ ] **Step 5: Commit**

```bash
git add api/src/main/resources/db/migration/V2__seed_data.sql
git commit -m "fix: update seed data with valid BCrypt password hashes"
```

---

### Task 12: Scaffold React frontend project

**Files:**
- Create: `frontend/` directory with full project setup

- [ ] **Step 1: Create Vite React TypeScript project**

```bash
cd /home/sbilakhia/Documents/dev/repos/library-system
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

- [ ] **Step 2: Install core dependencies**

```bash
cd frontend
npm install react-router-dom@6 zustand @tanstack/react-query axios clsx lucide-react
npm install -D @types/node
```

- [ ] **Step 3: Configure Vite with backend proxy**

Replace `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 4: Configure TypeScript path aliases**

Replace `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Commit**

```bash
cd /home/sbilakhia/Documents/dev/repos/library-system
git add frontend/
git commit -m "feat: scaffold React 18 + Vite + TypeScript frontend project"
```

---

### Task 13: Create TypeScript types and API service

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/services/api.ts`
- Create: `frontend/src/services/authService.ts`

- [ ] **Step 1: Create TypeScript types**

Create `frontend/src/types/index.ts`:

```typescript
export type UserRole = 'ADMIN' | 'LIBRARIAN' | 'MEMBER';
export type MembershipType = 'STUDENT' | 'FACULTY' | 'PUBLIC';
export type CopyStatus = 'AVAILABLE' | 'LOANED' | 'LOST' | 'DAMAGED';
export type ReservationStatus = 'PENDING' | 'READY' | 'EXPIRED' | 'CANCELLED' | 'FULFILLED';

export interface User {
  id: string;
  membershipId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailId: string;
  role: UserRole;
  membershipType: MembershipType;
  branchId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface Book {
  id: string;
  isbn: string;
  bookName: string;
  author: string;
  publication: string;
  language: string;
  location: string;
  description: string;
  coverImageUrl: string;
  categoryId: string | null;
  categoryName?: string;
  createdAt: string;
  availableCopies?: number;
  totalCopies?: number;
}

export interface BookCopy {
  id: string;
  bookId: string;
  branchId: string;
  branchName?: string;
  barcode: string;
  status: CopyStatus;
  createdAt: string;
}

export interface BookIssue {
  id: string;
  userId: string;
  userName?: string;
  copyId: string;
  bookName?: string;
  barcode?: string;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  renewed: boolean;
}

export interface BookReservation {
  id: string;
  userId: string;
  bookId: string;
  branchId: string;
  status: ReservationStatus;
  queuePosition: number;
  reservedAt: string;
  notifiedAt: string | null;
  expiresAt: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  code: number;
  data: T;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  email: string | null;
}

export interface DashboardStats {
  totalBooks: number;
  totalCopies: number;
  activeLoans: number;
  overdueBooks: number;
  totalUsers: number;
  activeReservations: number;
  totalBranches: number;
}
```

- [ ] **Step 2: Create Axios instance with auth interceptor**

Create `frontend/src/services/api.ts`:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

- [ ] **Step 3: Create auth service**

Create `frontend/src/services/authService.ts`:

```typescript
import api from './api';
import type { LoginRequest, LoginResponse, ApiResponse } from '@/types';

export const authService = {
  async login(data: LoginRequest): Promise<{ token: string; user: LoginResponse }> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', data);
    const authHeader = response.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || '';
    return { token, user: response.data.data };
  },

  async refreshToken(): Promise<string> {
    const response = await api.post<ApiResponse<{ token: string }>>('/auth/refresh');
    return response.data.data.token;
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};
```

- [ ] **Step 4: Create utility functions**

Create `frontend/src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function daysUntil(dateString: string): number {
  const now = new Date();
  const target = new Date(dateString);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/ frontend/src/services/ frontend/src/lib/
git commit -m "feat: add TypeScript types, API service with auth interceptor"
```

---

### Task 14: Create Zustand stores

**Files:**
- Create: `frontend/src/stores/authStore.ts`
- Create: `frontend/src/stores/themeStore.ts`

- [ ] **Step 1: Create auth store**

Create `frontend/src/stores/authStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LoginResponse, UserRole } from '@/types';

interface AuthState {
  token: string | null;
  user: LoginResponse | null;
  isAuthenticated: boolean;
  login: (token: string, user: LoginResponse) => void;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (token: string, user: LoginResponse) => {
        localStorage.setItem('token', token);
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ token: null, user: null, isAuthenticated: false });
      },

      hasRole: (...roles: UserRole[]) => {
        const user = get().user;
        if (!user?.role) return false;
        return roles.includes(user.role as UserRole);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

- [ ] **Step 2: Create theme store**

Create `frontend/src/stores/themeStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', newTheme);
          return { theme: newTheme };
        }),
    }),
    { name: 'theme-storage' }
  )
);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/
git commit -m "feat: add Zustand auth and theme stores with persistence"
```

---

### Task 15: Create CSS styles

**Files:**
- Create: `frontend/src/index.css`
- Create: `frontend/src/App.css`
- Create: `frontend/src/pages/LoginPage.css`

- [ ] **Step 1: Create global CSS with custom properties**

Create `frontend/src/index.css`:

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-sidebar: #1e293b;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-sidebar: #e2e8f0;
  --border-color: #e2e8f0;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.1);
  --radius: 8px;
}

[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-sidebar: #020617;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-sidebar: #cbd5e1;
  --border-color: #334155;
  --accent: #60a5fa;
  --accent-hover: #3b82f6;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-secondary);
  color: var(--text-primary);
  line-height: 1.6;
}

a {
  color: var(--accent);
  text-decoration: none;
}

button {
  cursor: pointer;
  border: none;
  border-radius: var(--radius);
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-danger {
  background: var(--danger);
  color: white;
}

input, select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
  outline: none;
  width: 100%;
}

input:focus, select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow);
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge-success { background: #dcfce7; color: #166534; }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-danger { background: #fee2e2; color: #991b1b; }
.badge-info { background: #dbeafe; color: #1e40af; }
```

- [ ] **Step 2: Create App.css for layout**

Create `frontend/src/App.css`:

```css
.app-layout {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 260px;
  background: var(--bg-sidebar);
  color: var(--text-sidebar);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-header h2 {
  font-size: 18px;
  font-weight: 700;
}

.sidebar-nav {
  padding: 12px 0;
  flex: 1;
  overflow-y: auto;
}

.sidebar-nav a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  color: var(--text-sidebar);
  font-size: 14px;
  transition: background 0.2s;
}

.sidebar-nav a:hover {
  background: rgba(255, 255, 255, 0.1);
}

.sidebar-nav a.active {
  background: rgba(59, 130, 246, 0.2);
  color: var(--accent);
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 60px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 24px;
}
```

- [ ] **Step 3: Create LoginPage.css**

Create `frontend/src/pages/LoginPage.css`:

```css
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg-secondary);
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px;
}

.login-card h1 {
  text-align: center;
  margin-bottom: 8px;
  font-size: 24px;
}

.login-card .subtitle {
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 32px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
}

.login-card .btn-primary {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  margin-top: 8px;
}

.login-error {
  background: #fee2e2;
  color: #991b1b;
  padding: 10px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  margin-bottom: 16px;
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/index.css frontend/src/App.css frontend/src/pages/LoginPage.css
git commit -m "feat: add CSS styles with light/dark theme support"
```

---

### Task 16: Create React components and pages

**Files:**
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/DashboardPage.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/main.tsx`

- [ ] **Step 1: Create ProtectedRoute component**

Create `frontend/src/components/ProtectedRoute.tsx`:

```tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user?.role && !roles.includes(user.role as UserRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Create Layout component**

Create `frontend/src/components/Layout.tsx`:

```tsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { BookOpen, Users, LayoutDashboard, ArrowLeftRight, LogOut, Bell, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Layout() {
  const { user, logout, hasRole } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = hasRole('ADMIN');
  const isLibrarian = hasRole('LIBRARIAN');
  const isStaff = isAdmin || isLibrarian;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>📚 Library System</h2>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          <NavLink to="/books" className={({ isActive }) => isActive ? 'active' : ''}>
            <BookOpen size={18} />
            Books
          </NavLink>
          {isStaff && (
            <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
              <Users size={18} />
              Users
            </NavLink>
          )}
          <NavLink to="/checkouts" className={({ isActive }) => isActive ? 'active' : ''}>
            <ArrowLeftRight size={18} />
            {isStaff ? 'Checkouts' : 'My Books'}
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ opacity: 0.7 }}>{user?.role}</div>
          </div>
          <button className="btn-secondary" onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none' }}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          <div className="header-right">
            <Bell size={20} style={{ cursor: 'pointer' }} />
            <span style={{ fontSize: 14 }}>{user?.firstName}</span>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create LoginPage**

Create `frontend/src/pages/LoginPage.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';
import './LoginPage.css';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user } = await authService.login({ username, password });
      login(token, user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card card">
        <h1>📚 Library System</h1>
        <p className="subtitle">Sign in to your account</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create DashboardPage placeholder**

Create `frontend/src/pages/DashboardPage.tsx`:

```tsx
import { useAuthStore } from '@/stores/authStore';

export function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p style={{ marginBottom: 24, color: 'var(--text-secondary)' }}>
        Welcome back, {user?.firstName}!
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Total Books</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>—</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Active Loans</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>—</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Overdue Books</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--danger)' }}>—</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Total Users</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>—</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create App.tsx with routing**

Replace `frontend/src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import '@/App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/books" element={<div className="page-title">Books</div>} />
            <Route path="/users" element={<div className="page-title">Users</div>} />
            <Route path="/checkouts" element={<div className="page-title">Checkouts</div>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

- [ ] **Step 6: Update main.tsx**

Replace `frontend/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: add React layout, login page, dashboard, routing, and protected routes"
```

---

### Task 17: Verify end-to-end login flow

- [ ] **Step 1: Start backend**

```bash
cd api && ./mvnw spring-boot:run
```

Verify: Application starts on port 8082, Flyway migrations applied.

- [ ] **Step 2: Start frontend**

```bash
cd frontend && npm run dev
```

Verify: Vite dev server starts on port 5173.

- [ ] **Step 3: Test login in browser**

Navigate to `http://localhost:5173`. Should redirect to `/login`. Enter `admin` / `admin123`. Should redirect to `/dashboard` with "Welcome back, Admin!" message.

- [ ] **Step 4: Test role-based navigation**

Verify sidebar shows Dashboard, Books, Users, Checkouts for admin role.

- [ ] **Step 5: Test protected route**

Navigate to `http://localhost:5173/dashboard` without logging in. Should redirect to `/login`.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve frontend issues for login flow"
```

---

## Sprint 1 Exit Criteria

- [ ] Backend starts on Java 17 with Spring Boot 3.3.x
- [ ] Flyway creates all tables with proper foreign keys
- [ ] Seed data: 3 branches, 7 categories, 3 users, 5 books, 8 copies
- [ ] JWT login works with role-based token
- [ ] Frontend login page renders and authenticates against backend
- [ ] Protected routes redirect to login
- [ ] Layout shell with sidebar navigation works
- [ ] Dashboard placeholder shows user name
- [ ] No console errors in browser
- [ ] `git log --oneline` shows clean commit history for Sprint 1
