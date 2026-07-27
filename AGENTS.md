# Agents

This file provides context for AI coding agents working on the Library System.

## Repository Overview

A REST API for managing a library system: books, users, book issues/returns, and QR code generation.

| Layer | Stack |
|-------|-------|
| Backend | Kotlin 1.9.25, Spring Boot 3.3.5, JDK 17, JPA/Hibernate |
| Build | Gradle 8.10.2 (Kotlin DSL) |
| Database | MySQL (4 tables) |
| Auth | Spring Security + JWT (Auth0 java-jwt) |
| QR Code | External API (api.qrserver.com) |

## Quick Reference

For detailed architecture and module documentation, see `docs/business-context.html`.

For reference docs, see `docs/reference/INDEX.md`.
