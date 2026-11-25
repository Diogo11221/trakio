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
    welcome, sign-in   entrada
    (tabs)/            Hoje · Treinar · Nutrição · Progresso · Perfil
    workout            treino ao vivo (série ⇄ descanso, ordem do treino)
    workout-done       resumo
    meal-log           registo de refeição com IA (modal)
    trainers/          marketplace de PTs
    tools/             calculadoras do cliente (Progresso, Perfil)
    pt/                app do PT: Início · Alunos · Planos · Mensagens · Ganhos,
                       aluno, editor de plano, conversa, verificar perfil, tools/
  components/          design system (texto, botões, sheet, anel, segmented…)
  features/            workout · nutrition · marketplace · profile · pt · tools
  lib/                 haptics, formatação pt-PT, useNow
  state/               preferências (vibração, alerta, Premium)
  theme/tokens.ts      espelho das variáveis "Trakio Tokens" do Figma
assets/figma/          ícones e renders exportados do Figma
```

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

- Dados são mock (`features/*/data.ts`) até existir API no `backend-core` / `backend-ai`.
- Autenticação, Stripe e IA de refeições são simulados.
- Live Activity no ecrã bloqueado (estado C do Figma) precisa de extensão nativa — por agora é uma notificação local.
