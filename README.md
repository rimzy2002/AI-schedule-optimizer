# AI Schedule Optimizer

Day 1 - Foundation + Database + Authentication + App Shell

## Overview
This is a monorepo containing:
- `apps/web`: React Frontend
- `apps/api`: Express Backend API
- `packages/shared`: Shared Types and Utilities
- `packages/database`: Database configuration and ORM models

## Getting Started

1. Copy `.env.example` to `.env` and fill in the values.
2. Run `docker-compose up -d` to start MySQL and Redis.
3. Run `npm install` to install dependencies across the monorepo.
4. Run `npm run dev` to start both the API and Web applications concurrently.

## Available Scripts

- `npm run dev`: Runs all development scripts.
- `npm run dev:web`: Starts only the web frontend.
- `npm run dev:api`: Starts only the API backend.
- `npm run worker`: Starts background workers in the API.
- `npm run build`: Builds all workspaces.
- `npm run test`: Runs tests across all workspaces.
- `npm run lint`: Runs linters across all workspaces.
