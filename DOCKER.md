# Docker deployment

1. Copy the example env file:

```bash
cp .env.docker.example .env
```

2. Edit `.env` and change at least:

```bash
POSTGRES_PASSWORD=...
JWT_SECRET=...
DEFAULT_ADMIN_EMAIL=admin@tunibots.com
DEFAULT_ADMIN_PASSWORD=...
```

Notes:

- `DATABASE_URL` is generated automatically inside the app container from `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`.
- If a secret contains `$`, wrap the value in single quotes inside `.env` so Docker Compose keeps it literal.
- Passwords may contain special characters such as `$` or `@`; the startup script encodes them correctly for Prisma.

3. Build and start:

```bash
docker compose up -d --build
```

Or use the deployment script:

```bash
./deploy.sh
```

The app will be available on:

```bash
http://127.0.0.1:3017
```

Prisma migrations run automatically when the app container starts.

## Nginx with tunibots.com

The repository includes a production Nginx vhost at `deploy/nginx/tunibots.com.conf`.

Expected flow:

- Docker publishes the app on `127.0.0.1:3017`
- Nginx terminates TLS for `tunibots.com` and `www.tunibots.com`
- Nginx proxies requests to `http://127.0.0.1:3017`

Install it for Debian/Ubuntu:

```bash
sudo cp deploy/nginx/tunibots.com.conf /etc/nginx/sites-available/tunibots.com.conf
sudo ln -s /etc/nginx/sites-available/tunibots.com.conf /etc/nginx/sites-enabled/tunibots.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

If Let's Encrypt files are not present yet, obtain them first:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tunibots.com -d www.tunibots.com
```

Useful commands:

```bash
docker compose logs -f app
docker compose ps
docker compose down
docker compose down -v
```

`docker compose down -v` removes the PostgreSQL volume and deletes database data.
