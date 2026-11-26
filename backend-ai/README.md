# Trakio — backend-ai

Serviço de IA/ML em **Python 3.12+ · FastAPI · scikit-learn**. É **interno**: só o `backend-core` lhe
fala (cabeçalho `X-Internal-Token`, comparado em tempo constante); as apps nunca o veem e o compose não
publica a porta. Sem documentação pública (`/docs` desligado).

| Endpoint | O quê |
| --- | --- |
| `POST /v1/meals/estimate` | Texto e/ou foto → alimentos, gramas e valores por 100 g, para a pessoa rever |
| `POST /v1/transcribe` | Áudio (m4a/webm/wav/ogg/caf) → texto, localmente |
| `POST /v1/readiness` | Treinos recentes → prontidão 0–100 |
| `POST /v1/insights` | Dados de um aluno → sugestões para o PT |
| `GET /health` | Estado |

## Reconhecimento de refeições (Claude)

- Modelo `claude-opus-5-5` (`TRAKIO_AI_MODEL`) com esforço `low` (`TRAKIO_AI_EFFORT`): é extração simples.
- Resposta em **JSON com esquema fixo** (structured outputs), validada outra vez aqui.
- A tabela de alimentos da Trakio vai no prompt de sistema, em cache. **Para alimentos da tabela, os valores
  vêm sempre da tabela**, nunca do modelo; estimativas para outros alimentos são recusadas se forem
  fisicamente impossíveis (macros a pesar mais do que o alimento, energia que não bate certo).
- A descrição da pessoa vai entre etiquetas e o prompt manda tratá-la só como descrição (proteção contra
  instruções escondidas no texto). Recusas do modelo são tratadas, com *fallback* do lado do servidor.
- **Nada é gravado aqui**: a app mostra a estimativa editável e só o "Confirmar" guarda a refeição.
- Sem `ANTHROPIC_API_KEY`, o serviço diz que não está disponível e o `backend-core` usa o leitor de
  palavras para texto (fotos pedem que se escreva o prato).

## Voz

`faster-whisper` corre **no próprio servidor** (o áudio não sai para terceiros nem é guardado). É opcional
porque o modelo é grande: `pip install '.[voice]'` ou `TRAKIO_AI_VOICE=1` no compose.

## Prontidão (scikit-learn)

Um `HistGradientBoostingClassifier` prevê a probabilidade de o próximo treino ser "duro" ou "no limite" (a
sensação que cada pessoa regista no fim do treino é o rótulo); prontidão = 100 × (1 − p).

Variáveis: carga aguda (7 dias) ÷ crónica (média semanal até 4 semanas, só desde o primeiro treino), séries
na semana, dias desde o último treino, treinos na semana, parte de treinos duros, sensação do último treino
e monotonia. Restrições monótonas garantem que mais carga nunca aumenta a prontidão e mais descanso nunca a
baixa.

**Honestidade sobre os dados:** ainda não há dados reais suficientes, por isso o modelo inicial é treinado com
atletas sintéticos gerados a partir das relações descritas na literatura de monitorização de carga (AUC ≈ 0,73
em dados retidos). Quando houver histórico real, re-treina-se com:

```bash
python -m trakio_ai.training --csv sessoes.csv   # colunas: as variáveis acima + label (1 = duro/no limite)
```

## Sugestões para o PT

Regras explícitas (um PT tem de perceber porque apareceu cada sugestão), sempre com os números:

- **Semana leve** — prontidão baixa ou volume a subir ≥ 15 % face a semanas em que treinou (nunca a quem anda
  a faltar aos treinos).
- **Treino em casa** — fez menos de 70 % dos treinos previstos.
- **Variação** — um exercício sem evolução da carga máxima estimada há 3 semanas.

O `backend-core` esconde durante 14 dias as sugestões que o PT aplicou ou ignorou.

## Correr

```bash
python3 -m venv .venv && .venv/bin/pip install -e '.[dev]'
TRAKIO_AI_TOKEN=$(openssl rand -hex 32) .venv/bin/uvicorn trakio_ai.main:app --port 8000
.venv/bin/python -m pytest -q      # 11 testes (o Claude é simulado; nenhum pedido sai para a API)
```

| Variável | Para quê |
| --- | --- |
| `TRAKIO_AI_TOKEN` | segredo partilhado com o `backend-core` (obrigatório, 32+ caracteres) |
| `ANTHROPIC_API_KEY` | chave da API do Claude (opcional) |
| `TRAKIO_AI_MODEL`, `TRAKIO_AI_EFFORT` | modelo e esforço (por omissão `claude-opus-5-5`, `low`) |
| `TRAKIO_AI_WHISPER_MODEL` | modelo de voz (`small`) |
| `TRAKIO_AI_MODEL_DIR` | onde fica o modelo de prontidão treinado |
