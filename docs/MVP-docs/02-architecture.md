# Architecture

## Architecture Style

Modular monolith.

## Tech Stack

Frontend / Backend

- Next.js (App Router)
- TypeScript
- React

UI

- Tailwind CSS
- shadcn/ui

Database

- Postgres

ORM

- Prisma

Auth

- Clerk

Validation

- Zod

Forms

- React Hook Form

Hosting

- Vercel

## Repository Structure

src/
  app/
  components/
  lib/
  server/
    services/
    repositories/
    algorithms/

## Key Architecture Rules

Business logic must NOT live in page components.

Domain logic should live in:

server/services

Reusable logic should be placed in:

server/algorithms