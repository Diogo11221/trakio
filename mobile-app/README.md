# Trakio — App mobile (cliente e PT)

App do cliente e do Personal Trainer em **Expo SDK 58 + React Native 0.88 + Expo Router**, construída a
partir das páginas "04 · App · Cliente" e "05 · App · PT" do Figma _Trakio — Design_. Em Boas-vindas,
"Sou Personal Trainer" abre a app do PT.

## Correr

```bash
npm install
npx expo start        # i = iOS, a = Android, w = web
```

Todos os módulos nativos usados (haptics, notificações locais, keep-awake, blur, gradientes,
gesture-handler, reanimated, svg) vêm no Expo Go — não é preciso development build para já.

```bash
npm run typecheck
npm run lint
```

## Estrutura

```
src/
  app/                 rotas (Expo Router)
    welcome            como vais treinar (sozinho / com PT / sou PT)
    sign-up, sign-in   criar conta e entrar
    onboarding         criar perfil em passos (cliente 5, PT 4)
    edit-profile       editar perfil
    (tabs)/            Hoje · Treinar · Nutrição · Progresso · Perfil
    workout            treino ao vivo (série ⇄ descanso, ordem do treino)
    workout-done       resumo
    meal-log           registo de refeição com IA (modal)
    trainers/          marketplace de PTs
    tools/             calculadoras do cliente (Progresso, Perfil)
    pt/                app do PT: Início · Alunos · Planos · Mensagens · Ganhos,
                       aluno, editor de plano, conversa, verificar perfil, tools/
  components/          design system (texto, botões, sheet, anel, segmented…)
  features/            auth · workout · nutrition · marketplace · profile · pt · tools
  lib/                 cliente da API e sessão segura, haptics, formatação pt-PT
  state/               sessão (auth), preferências e Premium, conversas
  theme/tokens.ts      espelho das variáveis "Trakio Tokens" do Figma
assets/figma/          ícones e renders exportados do Figma
```

## Servidor

A app fala com o `backend-core` (`../backend-core`). Em desenvolvimento, aponta para a porta 8080 da máquina
onde corre o Expo, por isso um telemóvel na mesma rede Wi-Fi chega lá sem configuração. Para outro servidor:

```bash
EXPO_PUBLIC_API_URL=https://api.trakio.app npx expo start
```

Arranca o backend com o perfil `dev` (pagamentos falsos e contas de demonstração) — ver o README da raiz.

## Contas e sessão

- **Criar conta / Entrar** no servidor. O token de acesso (15 min) fica só em memória; o de renovação fica no
  **Keychain (iOS) / Keystore (Android)** via `expo-secure-store` e é trocado a cada uso. Se o servidor
  terminar a sessão (palavra-passe mudada, conta suspensa), a app volta ao início.
- Contas de demonstração do servidor (`trakio123`), com atalhos em Entrar **só em desenvolvimento**:
  `miguel@trakio.test` (aluno com PT e Premium) e `rita@trakio.test` (PT com 7 alunos).
- "Com o meu PT" no início leva ao marketplace: a ligação a um PT só existe depois de o pagamento ser
  confirmado no servidor. Premium e marketplace pagam-se pelo Stripe (instantâneo em desenvolvimento) e
  cancelar pede sempre confirmação explícita.
- Apagar a conta pede a palavra-passe e apaga tudo no servidor.

## De onde vêm os dados

| O quê | Provider | API |
| --- | --- | --- |
| Conta, perfil, foto, preferências | `state/auth.tsx`, `state/settings.tsx` | `me`, `me/profile`, `me/preferences`, `files` |
| Plano e biblioteca | `features/workout/plan.tsx` | `me/plan`, `exercises` |
| Treinos feitos | `features/workout/history.tsx` | `me/workouts` (volume e recordes calculados no servidor; reenviar não duplica) |
| Treino a meio | `features/workout/store.tsx` | `me/live-workout` + cópia no telemóvel (ginásios sem rede) |
| Prontidão | `features/progress/readiness.ts` | `me/readiness` (modelo do `backend-ai`) |
| Pesagens | `features/progress/weight.tsx` | `me/weights` |
| Diário alimentar | `features/nutrition/diary.tsx` | `me/meals` |
| Registo com IA (Premium) | `app/meal-log.tsx` | `me/meals/ai-estimate` (texto e foto), `me/meals/transcribe` (voz); grava só depois de "Confirmar" |
| Conversas | `state/chat.tsx` | `conversations` (lista a cada 15 s, conversa aberta a cada 4 s) |
| Marketplace | `features/marketplace/data.ts` | `trainers`, `trainers/{id}/hire` |
| PT: alunos, sugestões, planos, agenda, ganhos, verificação | `features/pt/store.tsx`, `features/pt/useStudent.ts` | `trainer/*` |

Puxar para baixo nos separadores recarrega tudo (`lib/refresh.ts`). As fotos protegidas são pedidas com o
token (`lib/api.ts` → `protectedImage`) e os PDFs abrem por ligação assinada de 5 minutos.
