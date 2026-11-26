# Trakio — backend-core

API da Trakio em **Java 25 + Spring Boot 4.2**, **PostgreSQL** e **Flyway**. Serve a app mobile (cliente e PT),
o backoffice web e os pagamentos (Stripe). A IA/ML fica no `backend-ai`.

A API segue a forma dos providers da app (`features/auth/localAuth.ts`, `workout/history.tsx`,
`nutrition/diary.tsx`, `state/chat.tsx`, `pt/store.tsx`) e do admin (`web-app/src/data/store.tsx`): trocar os
dados locais pela API é trocar os providers, não os ecrãs.

## Correr

```bash
# Com Docker (PostgreSQL + API), a partir da raiz do repositório
cp .env.example .env        # muda POSTGRES_PASSWORD
docker compose -f docker.compose.yml up --build

# Sem Docker para a API (precisa de um PostgreSQL local com a base "trakio")
cd backend-core
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
```

O perfil **`dev`** usa pagamentos falsos (tudo é pago na hora) e cria as contas de teste da app, com a
palavra-passe `trakio123`: `miguel@trakio.test` (aluno da Rita, Premium, 8 semanas de treinos),
`rita@trakio.test` (PT), `ana@trakio.test`, `tiago@`, `bruno@`, `ines@` (verificação pendente) e
`admin@trakio.test`. Nunca uses `dev` em produção: com o perfil `prod` os pagamentos falsos recusam arrancar.

```bash
./mvnw test     # 45 testes de integração contra PostgreSQL real (binários embebidos, sem Docker)
```

## Configuração

Tudo o que é sensível vem de variáveis de ambiente (ver `.env.example`); sem `TRAKIO_JWT_SECRET` a API não
arranca fora de `dev`.

| Variável | Para quê |
| --- | --- |
| `TRAKIO_DB_URL`, `TRAKIO_DB_USER`, `TRAKIO_DB_PASSWORD` | PostgreSQL |
| `TRAKIO_JWT_SECRET` | chave HMAC dos tokens (base64, 32+ bytes: `openssl rand -base64 48`) |
| `TRAKIO_CORS_ORIGINS` | origens web autorizadas (admin, landing) |
| `TRAKIO_BOOTSTRAP_ADMIN_EMAIL` / `_PASSWORD` | cria o primeiro admin se ainda não houver nenhum |
| `TRAKIO_PAYMENTS_PROVIDER` | `stripe` (por omissão) ou `fake` (só `dev`) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID`, `STRIPE_MARKETPLACE_PRICE_ID` | Stripe |
| `TRAKIO_STORAGE_DIR` | onde ficam os ficheiros enviados |
| `TRAKIO_FORWARD_HEADERS` | `native` atrás de um proxy (para o IP real nos limites de pedidos) |

## Segurança

- **Palavras-passe** com Argon2id (prefixo `{argon2}`, re-hash automático se os parâmetros mudarem). Mínimo 8
  caracteres, máximo 128, recusa as mais comuns. Admins não se registam: o primeiro vem da configuração.
- **Sessões**: token de acesso JWT HS256 de 15 min (emissor, audiência e expiração verificados) + refresh token
  opaco de 30 dias, guardado só como SHA-256, **de uso único**. Reutilizar um refresh já usado (sinal de roubo)
  revoga a sessão inteira. Mudar a palavra-passe ou suspender a conta invalida logo todos os tokens de acesso
  (versão do token verificada a cada pedido).
- **Força bruta**: 5 palavras-passe erradas pausam o email 15 min (exista ou não a conta), 20 pedidos/min por IP
  nos endpoints de autenticação, 300/min no resto. Respostas iguais para "email não existe" e "palavra-passe
  errada", com o mesmo tempo de resposta.
- **Autorização por objeto**: um PT só chega aos alunos que lhe pagam agora; uma conversa só aos dois
  participantes; ficheiros só a quem os pode ver. Um ID alheio responde 404 (não confirma que existe).
- **O que a app não pode decidir**: Premium, visibilidade no marketplace e a ligação a um PT vêm só de
  pagamentos confirmados; volume, recordes, calorias de alimentos conhecidos e cartões de treino no chat são
  calculados no servidor; o PT só fica verificado por decisão de um admin.
- **Pagamentos**: Stripe Checkout (os dados do cartão nunca passam por aqui), Connect com a comissão de 10 %
  como *application fee*, webhooks com assinatura verificada (tolerância de 5 min) e processados uma só vez.
  Cancelar exige `{"confirm": true}`: nunca é um interruptor.
- **Uploads**: o tipo é detetado pelos bytes (JPEG, PNG, PDF), não pelo nome; o EXIF/metadados das fotos (que
  podem ter a localização GPS) é removido; nomes aleatórios no disco; servidos com `nosniff`, PDFs como anexo.
- **Pedidos**: validação `jakarta.validation` em todos os DTOs (as entidades nunca saem da API), corpo JSON
  limitado a 256 KB, erros em RFC 9457 sem detalhes internos, cabeçalhos de segurança (CSP `default-src
  'none'`, HSTS, `X-Frame-Options: DENY`, `no-store`), CORS fechado à lista configurada, só `/actuator/health`
  exposto.
- **Admin**: todas as decisões (verificações, reembolsos, suspensões, denúncias, biblioteca) ficam no registo de
  auditoria. Apagar a conta pede a palavra-passe, cancela subscrições e apaga dados e ficheiros (RGPD).

## API (`/api/v1`)

Respostas em JSON; enums em minúsculas com hífen (`refund-requested`), dinheiro em cêntimos, datas ISO-8601
em UTC, dias (`day`) no calendário de Lisboa. Erros: `application/problem+json` com `code`
(`email-taken`, `wrong-credentials`, `weak-password`…). Autenticação: `Authorization: Bearer <accessToken>`.

| Área | Endpoints |
| --- | --- |
| Sessão | `POST auth/sign-up`, `auth/sign-in`, `auth/refresh`, `auth/sign-out` · `POST me/password` · `DELETE me` |
| Conta | `GET me` · `PUT me/profile` (`kind: client \| trainer`) · `PUT me/preferences` |
| Ficheiros | `POST files` (multipart, `purpose=avatar\|chat\|meal\|verification`) · `GET files/{id}` |
| Treino | `GET exercises` · `GET plans/templates` · `GET plans/{id}` · `GET/PUT me/plan` · `GET/POST me/workouts` (idempotente por `clientRef`) · `GET/PUT/DELETE me/live-workout` |
| Progresso | `GET/POST me/weights`, `DELETE me/weights/{id}` · `GET me/progress?weeks=8` |
| Nutrição | `GET foods?q=` · `POST nutrition/parse` · `GET me/meals?day=` · `POST me/meals` · `DELETE me/meals/{id}` |
| Marketplace | `GET trainers?city=&specialty=` · `GET trainers/{id}` · `GET/POST trainers/{id}/reviews` · `POST trainers/{id}/hire` · `DELETE me/coaching` |
| Conversas | `GET conversations` · `GET conversations/{id}/messages?after=\|before=` · `POST …/messages` (`text`, `photo`, `file`, `workout`) · `POST …/read` |
| Pagamentos | `GET me/subscriptions` · `POST me/premium/checkout`, `me/premium/cancel` · `GET me/payments` · `POST me/payments/{id}/refund-request` |
| PT | `GET trainer/students`, `trainer/students/{id}` (+ `/workouts`, `/progress`, `/weights`, `/meals`, `/plan`) · `PUT trainer/students/{id}/plan` · `POST trainer/students/{id}/end` · `trainer/plans` (CRUD, `from-template/{id}`) · `trainer/packages` (CRUD) · `trainer/verification` (+ `documents/{type}`, `submit`) · `trainer/marketplace` (+ `checkout`, `cancel`) · `trainer/payout-account` (+ `onboarding`) · `GET trainer/earnings?month=` |
| Denúncias | `POST reports` |
| Admin | `GET admin/overview` · `admin/users` (+ `suspend`, `reactivate`) · `admin/payments` (+ `refund-decision`) · `admin/verifications` (+ `decision`), `admin/verification-documents/{id}/status` · `admin/reports` (+ `resolve`) · `admin/exercises` (+ `demo-status`) · `GET admin/audit` |
| Stripe | `POST billing/stripe/webhook` (assinado) |

## Estrutura

```
src/main/java/com/trakio/core/
  auth/          contas, tokens (JWT + refresh com rotação), travão de força bruta, política de palavras-passe
  account/       perfis de cliente e PT, preferências, GET /me
  files/         uploads: deteção do tipo real, remoção de metadados, acesso por finalidade
  exercise/ plan/ workout/ progress/   biblioteca, planos (modelos, do PT, do aluno), treinos, progresso
  nutrition/     alimentos, leitor de refeições em texto, diário e metas
  marketplace/ coaching/ chat/         diretório de PTs, pacotes, avaliações, acompanhamento, conversas
  billing/       subscrições, pagamentos, Stripe (Checkout, Connect, webhooks) e o modo falso de dev
  verification/ moderation/ admin/     verificação de PTs, denúncias, backoffice e auditoria
  config/ common/                      segurança, limites de pedidos, erros, fórmulas partilhadas com a app
src/main/resources/db/migration/       Flyway: esquema, exercícios e plano A·B·C, tabela de alimentos
```

## Ainda não feito

- **Notificações push** (Expo) para mensagens novas: o chat funciona por *polling* (`?after=`).
- **Pacotes mensais com renovação automática**: hoje cada pagamento cobre um mês; o passo seguinte é uma
  subscrição Stripe com `application_fee_percent` na conta do PT.
- **Armazenamento S3** para ficheiros (a interface `FileStorage` já está pronta) e limites de pedidos partilhados
  (Redis) se houver mais de uma instância.
- Sugestões de IA e prontidão vêm do `backend-ai`.
