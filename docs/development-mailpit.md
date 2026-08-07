# Development mailbox

Start the development-only mailbox from the repository root:

```powershell
docker compose -f docker-compose.dev.yml up -d mailpit
```

Mailpit listens on SMTP `localhost:1025` and its web UI is `http://localhost:8025`.
For a backend running in a Docker network, use `mailpit:1025` instead of
`localhost:1025`. Keep these values in development environment configuration;
the production compose file does not include Mailpit.

To stop it:

```powershell
docker compose -f docker-compose.dev.yml down
```
