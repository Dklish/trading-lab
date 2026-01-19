# Flash Bot - Trading Lab Monorepo

A modular trading bot platform organized into distinct layers for maintainability and scalability.

## Architecture Layers

- **Presentation Layer** (`apps/web`) – Next.js web application for the user interface
- **Backend API Layer** (`apps/api`) – TypeScript backend API serving the UI and bot services
- **Market Data Layer** (`apps/market-feeds`) – Services connecting to exchanges and normalizing market data
- **Strategy/Bot Layer** (`apps/bot-runner`) – Service for running trading strategies, simulations, and training
- **Storage Layer** (`db/`) – PostgreSQL for historical data and configs, Redis for live state
- **Infrastructure Layer** (`infra/`) – Docker, Kubernetes, and AWS deployment configurations

## Project Structure

```
flash-bot/
├── apps/
│   ├── web/              # Next.js frontend
│   ├── api/              # Backend API
│   ├── market-feeds/     # Exchange data services
│   └── bot-runner/       # Strategy execution service
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   └── shared-utils/     # Shared utility functions
├── db/
│   └── migrations/       # Database migrations
├── infra/
│   ├── docker/           # Docker configurations
│   ├── k8s/              # Kubernetes manifests
│   └── aws/              # AWS infrastructure
└── docs/                 # Documentation
```
