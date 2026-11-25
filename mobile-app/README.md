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
    sign-up, sign-in   criar conta e entrar (contas de teste)
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
  lib/                 haptics, formatação pt-PT, useNow
  state/               sessão (auth), preferências (vibração, alerta, Premium)
  theme/tokens.ts      espelho das variáveis "Trakio Tokens" do Figma
assets/figma/          ícones e renders exportados do Figma
```

## Contas (versão de teste)

Ainda não há base de dados: as contas ficam guardadas **só no telemóvel** (AsyncStorage), com a
palavra-passe com sal e SHA-256 (`features/auth/localAuth.ts`). O módulo tem a mesma forma que a futura
API do `backend-core` — troca-se esse ficheiro e os ecrãs ficam iguais.

- **Criar conta** → email e palavra-passe (8+ caracteres) → **perfil em passos**:
  - cliente: nome e foto · sexo, ano de nascimento, altura, peso · objetivo (e peso a atingir) · dias de treino, experiência, atividade · resumo com o índice de massa corporal e as calorias;
  - PT: nome e foto · cidade / online · especialidades (até 4) · resumo.
- A sessão mantém-se ao fechar a app; **Terminar sessão** e **Apagar conta de teste** estão no Perfil (PT: Conta).
- O nome, a foto e as medidas aparecem em Hoje, Perfil, Início do PT e nas calculadoras.
- Contas de teste (palavra-passe `trakio123`), também como atalho em Entrar:
  - `miguel@trakio.test` — aluno com PT
  - `rita@trakio.test` — PT

## Dados guardados no telemóvel (antes do backend)

Tudo o que a pessoa faz fica guardado por conta, em AsyncStorage (`lib/persist.ts`), com a forma que a
API vai ter — trocar para o `backend-core` é trocar os providers, não os ecrãs.

| O quê | Onde | Notas |
| --- | --- | --- |
| Treinos feitos | `features/workout/history.tsx` | séries reais, volume, recordes (carga máxima estimada) e sensação |
| Treino a meio | `features/workout/store.tsx` | volta ao abrir a app ("Sair e continuar depois") |
| Plano A · B · C | `features/workout/data.ts` | o próximo vem do histórico; cargas começam no que fizeste da última vez |
| Diário alimentar | `features/nutrition/diary.tsx` | por dia; metas a partir do perfil (mesmas contas das calculadoras) |
| Reconhecer refeições | `features/nutrition/foods.ts` | tabela local de ~45 alimentos + leitura de texto ("2 ovos, 150 g de frango e arroz") |
| Peso | `features/progress/weight.tsx` | registar no Progresso atualiza o perfil |
| Conversas PT ⇄ aluno | `state/chat.tsx` | partilhadas entre contas do mesmo telemóvel: o Miguel e a Rita (contas de teste) falam um com o outro |
| Preferências | `state/settings.tsx` | vibração, alerta, som do descanso, Premium |
| PT: planos, verificação, marketplace | `features/pt/store.tsx` | edições de planos guardadas; "Guardar e enviar" avisa o aluno no chat |

A conta de teste do Miguel começa com 8 semanas de treinos, pesagens e um dia de refeições para o
Progresso ter o que mostrar; contas novas começam vazias.

## Calculadoras

Seis ferramentas partilhadas entre as duas apps (`features/tools`), com as fórmulas em `calc.ts`
(funções puras, sem React):

| Ferramenta | Fórmula |
| --- | --- |
| Índice de massa corporal | peso / altura², categorias da OMS e peso saudável para a altura |
| Calorias por dia | Mifflin–St Jeor × nível de atividade; −20% para perder, +10% para ganhar; proteína 1,8–2,2 g/kg, gordura 25% |
| Peso máximo numa repetição | média de Epley e Brzycki, tabela por número de repetições (arredondada a 2,5 kg) |
| Percentagem de gordura | método da Marinha dos EUA (fita métrica), escalões do ACE |
| Água por dia | 35 ml/kg + 500 ml por hora de treino |
| Discos na barra | discos por lado para barras de 20, 15 ou 10 kg |

- **Cliente:** começam com os dados do próprio (Progresso → Ferramentas, Perfil → Calculadoras).
- **PT:** escolhe o aluno ("Para quem?"), os valores começam com as últimas medidas dele e "Enviar ao aluno"
  publica o resultado na conversa. Também em Início → Ferramentas e no ecrã do aluno ("Medidas e cálculos").

## Gestos e vibração

| Onde | Gesto | Feedback |
| --- | --- | --- |
| Série ativa — peso / repetições | tocar e escrever (teclado numérico, "OK" para fechar) | toque leve ao focar |
| Concluir série | só o botão "Concluir série" grava a série e abre o descanso | sucesso |
| Descanso | anel a esvaziar, −15 s / +15 s, manter premido nos +/− | ticks nos últimos 3 s, vibração forte no fim |
| Fim do descanso | "plim" (toca mesmo em silêncio) + notificação "Descanso terminado" | vibração forte |
| Ordem do treino | manter premido e arrastar para reordenar; "Retomar" adiados | impacto ao pegar, tick por posição |
| Demo 3D / mapa muscular | arrastar para inclinar em perspetiva | mola de regresso |
| Folhas (Premium, contratar, ordem) | arrastar o topo para baixo para fechar | impacto ao passar o limite |
| Registo IA — quantidades | arrastar para os lados (5 g por passo) | tick por passo |
| Voltar no treino | "Sair do treino?": continuar, terminar e ver resumo, ou sair e continuar depois | — |
| Tabs, chips, segmented, toggles | toque | seleção / toque leve |

A opção **Vibração** em Perfil desliga todas as vibrações da app.
Pagamentos (Premium, contratar PT) são sempre uma confirmação explícita com preço, cartão e data — nunca um interruptor.

## Ainda por ligar

- Os dados ficam só no telemóvel (ver acima) até existir API no `backend-core` / `backend-ai`.
- Fotos de refeições e voz precisam do `backend-ai`; por agora o registo lê texto (e o ditado do teclado).
- Apple Health / relógio precisam de development build; a prontidão é calculada a partir dos treinos.
- Videochamadas ainda não existem; combina-se pelo chat.
- Alunos novos que contratam a Rita conversam com ela, mas ainda não aparecem na caixa da conta da Rita (precisa de backend).
- Contas são locais (teste); Stripe e IA de refeições são simulados. Entrar com Apple/Google ainda não está ligado.
- Live Activity no ecrã bloqueado (estado C do Figma) precisa de extensão nativa — por agora é uma notificação local.
