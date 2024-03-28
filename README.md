# waslaeuft.in

waslaeuft.in ist ein Projekt, das es zum Ziel hat, eine Überblicksseite für deine Stadt bereitzustellen, auf der du siehst, welche Filme heute und in der Zukunft in deiner Stadt laufen.

## Verwendete Technologien

- Next.js (Frontend & Backend)
- Prisma (Datenbank, PostgreSQL)
- tRPC (Backend)
- NextJS Cron (Zum nächtlichen Updaten der Filme)

## Lokale Entwicklung

- Pakete installieren `bun install`
- Datenbank konfigurieren: `DATABASE_URL` in `.env` eintragen
- Datenbank migrieren: `bun prisma db push`
- App starten: `bun dev`

## Contributing

Aktuell entwickle ich dieses Projekt unregelmäßig in meiner Freizeit weiter.
Falls du Lust hast, Kinos hinzuzufügen oder andere Änderungen vorzunehmen, erstelle gerne eine Pull Request oder ein Issue :)

(Die Code Qualität ist eher auf Spaghetti Level, aber es funktioniert gut genug ^^)
