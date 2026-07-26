# Agent Reference Index

Master navigation hub for AI coding agents working on the Library Management System.

## Repository Overview

REST API for managing a library: books, users, book issues/returns, and QR code generation.

| Layer | Stack |
|-------|-------|
| Backend | Kotlin 1.4.30, Spring Boot 2.4.3, JDK 11, JPA/Hibernate |
| Database | MySQL (4 tables) |
| Auth | Spring Security + JWT (Auth0 java-jwt) |
| QR Code | External API (api.qrserver.com) |
| Build | Maven |

## Source Layout

```
api/
  src/main/kotlin/com/digihome/library/api/
    ApiApplication.kt              — Entry point, bean configuration
    configuration/Config.kt        — JwtConfig properties
    controller/
      BooksController.kt           — Book REST endpoints
      UserController.kt            — User REST endpoints
    database/
      dbservice/
        BooksDbService.kt          — Book business logic
        UserDbService.kt           — User business logic
      entity/
        BooksEntity.kt             — Books JPA entity + repository
        UserEntity.kt              — User JPA entity + repository
        BookIssueEntity.kt         — BookIssue JPA entity + repository
        LoginEntity.kt             — Login JPA entity + repository
    models/
      BookModel.kt                 — AddBookModel, BookIssueModel, BookFilterModel
      UserModel.kt                 — AddUserModel
      LoginModel.kt                — LoginModel, LoginResponseModel
      ResponseModel.kt             — ResponseModel (API responses)
      QrCodeRequestModel.kt        — QrCodeDataModel
      GenericModel.kt              — ServiceResponseModel
    security/
      SecurityConfiguration.kt     — Spring Security config
      JWTAuthenticationFilter.kt   — Login authentication filter
      JWTAuthorizationFilter.kt    — Token validation filter
      LibraryUserDetailService.kt  — UserDetailsService impl
      LibraryUserPrincipal.java    — UserDetails impl
      SecurityHelper.kt            — Security utilities
  src/main/resources/
    application.yml                — App configuration
```

## Quick Reference: Common Agent Tasks

### Adding a New REST Endpoint

1. Define DTO in `api/src/main/kotlin/com/digihome/library/api/models/`
2. Add controller method in `api/src/main/kotlin/com/digihome/library/api/controller/`
3. Add service method in `api/src/main/kotlin/com/digihome/library/api/database/dbservice/`
4. If new table needed, add entity + repository in `api/src/main/kotlin/com/digihome/library/api/database/entity/`

### Adding a Database Table

1. Create JPA entity in `api/src/main/kotlin/com/digihome/library/api/database/entity/`
2. Add repository interface extending `JpaRepository`
3. Set `ddl-auto: update` in `application.yml` (dev) or write SQL migration
4. Validate by starting the application

### Modifying Security Rules

- Security config: `api/src/main/kotlin/com/digihome/library/api/security/SecurityConfiguration.kt`
- JWT config properties: `api/src/main/resources/application.yml` (jwt section)
- Currently all `/user/**` and `/books/**` endpoints are `permitAll()`

## Key Constraints

- **No Flyway/Liquibase**: Schema managed by Hibernate `ddl-auto` (currently `none` in production)
- **MySQL**: Production database at `31.220.53.211:3306/JsotLibrary`
- **JWT Secret**: Hardcoded in `application.yml` (should be externalized)
- **No frontend**: Backend-only REST API
