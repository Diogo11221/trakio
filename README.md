# Trakio

Treino, nutrição e marketplace de Personal Trainers. Cinco partes:

| Pasta | O quê | Stack |
| --- | --- | --- |
| `mobile-app/` | App do aluno e do PT | Expo 58 · React Native · TypeScript |
| `web-app/` | Backoffice da equipa Trakio | React 19 · Vite · TypeScript |
| `landing-page/` | Site público | React · Vite |
| `backend-core/` | API: contas, treino, nutrição, marketplace, chat, pagamentos, admin | Java 25 · Spring Boot 4.2 · PostgreSQL |
| `backend-ai/` | IA/ML interna: refeições (Claude), voz, prontidão, sugestões ao PT | Python · FastAPI · scikit-learn |

```
mobile-app ─┐                       ┌─ PostgreSQL
web-app ────┼── HTTPS ── backend-core ┼─ Stripe (Checkout, Connect, webhooks)
            │                       └─ backend-ai (rede interna, segredo partilhado) ── Claude API
```

## Correr tudo localmente

```bash
cp .env.example .env          # POSTGRES_PASSWORD e TRAKIO_AI_TOKEN (openssl rand -hex 32); ANTHROPIC_API_KEY opcional
docker compose -f docker.compose.yml up --build      # API em http://localhost:8080

cd web-app && npm install && npm run dev             # backoffice em http://localhost:5174
cd mobile-app && npm install && npx expo start       # app (Expo Go); aponta para a porta 8080 desta máquina
```

O perfil `dev` (por omissão no compose) usa pagamentos falsos e cria contas de demonstração com a
palavra-passe `trakio123`: `miguel@trakio.test` (aluno), `rita@trakio.test` (PT) e `admin@trakio.test`
(backoffice). Detalhes e todas as contas em `backend-core/README.md`.

Sem Docker: PostgreSQL local, `backend-ai` com `uvicorn` e `backend-core` com
`SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run` (ver os READMEs de cada pasta).

## Testes

```bash
cd backend-core && ./mvnw test                         # 54 testes de integração (PostgreSQL real, sem Docker)
cd backend-ai && .venv/bin/python -m pytest -q         # 11 testes
cd mobile-app && npm run typecheck && npm run lint
cd web-app && npm run build
```

## Segurança, em resumo

Palavras-passe Argon2id, sessões curtas com renovação de uso único, travão de força bruta, autorização por
objeto (um PT só vê os alunos que lhe pagam), uploads validados pelo conteúdo e sem metadados de localização,
pagamentos e Premium decididos só pelo Stripe (webhooks assinados), IA sem acesso direto das apps e nada gravado
sem confirmação. Pormenores em `backend-core/README.md` e `backend-ai/README.md`.
