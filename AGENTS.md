# Agents

This file provides context for AI coding agents working on the Library System.

## Repository Overview

A REST API for managing a library system: books, users, book issues/returns, and QR code generation.

| Layer | Stack |
|-------|-------|
| Backend | Kotlin 1.4.30, Spring Boot 2.4.3, JDK 11, JPA/Hibernate |
| Database | MySQL (4 tables) |
| Auth | Spring Security + JWT (Auth0 java-jwt) |
| QR Code | External API (api.qrserver.com) |

## Quick Reference

For detailed architecture and module documentation, see `docs/business-context.html`.

For reference docs, see `docs/reference/INDEX.md`.
