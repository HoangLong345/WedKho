# Run PostgreSQL 16 in Docker

1. Install Docker Engine/Desktop and Docker Compose.
2. In this `docker` folder, copy `.env.example` to `.env`, replace the password with your own strong password.
3. Run `docker compose up -d`.
4. Check `docker compose ps` and `docker compose logs db`.
5. Local DB: `127.0.0.1:5432`, database and user from `.env`. Adminer (local only): `http://127.0.0.1:8080`, system PostgreSQL; server `db`.
6. Verify seed using `docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FROM rack_slots;"'`; expected 23490.
7. Backup: `docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > warehouse_backup.sql`.
8. Stop without removing data: `docker compose down`. NEVER run `docker compose down -v` unless you intentionally want to delete the DB volume.

Important: SQL scripts in `/docker-entrypoint-initdb.d/` run only when the database volume is empty. For later changes use Alembic migrations. In production do not expose port 5432 to the internet; set up automated backups, TLS and secret management.

This package was NOT integration-tested inside Docker in the current environment; inspect logs after first startup.
