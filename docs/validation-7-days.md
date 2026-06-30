# LoopOS — Validação de 7 Dias (MVP v0.1)

## Objetivo

Provar que o LoopOS pode ser usado de forma contínua, sem abandono, por uma semana real — registrando dados reais da rotina da pessoa, não dados de teste. Este é o critério de sucesso definido para o v0.1 desde a Etapa 1: **7 dias consecutivos de uso sem abandono.**

Este documento não mede qualidade de código. Mede se o produto sobrevive ao contato com uma rotina real.

---

## Regras de uso

1. Use o app **diariamente**, idealmente no mesmo horário (manhã ou fim do dia).
2. Registre dados **reais**, não fictícios. Se você não correu, não registre uma corrida.
3. Não pule dias "para testar depois" — abandono no teste é o próprio sinal que estamos medindo.
4. Anote toda fricção na tabela da seção 6, no momento em que ela ocorre (não de memória, no fim do dia).
5. O app pode (e deve) ser usado em conjunto com `user_test_1` — não é necessário esperar autenticação real.

---

## Rotina diária recomendada

| Horário sugerido | Ação |
|---|---|
| Ao acordar ou no café da manhã | Abrir o app, ver a tela Hoje |
| Durante o dia | Registrar treino (Corpo) se houver |
| Durante o dia | Marcar hábitos no Ritmo conforme ocorrem |
| Durante ou após leitura | Registrar sessão em Leitura |
| Ao longo do dia | Adicionar/marcar itens em Listas conforme surgem tarefas |
| Antes de dormir | Reabrir Hoje, revisar o dia |

Não é necessário seguir esta ordem rigidamente — o objetivo é que o app seja tocado pelo menos 2 vezes ao dia.

---

## Checklist diário

Repita por 7 dias. Marque com ✓ ou ✗.

| Dia | Abriu Hoje | Registrou em Corpo/Ritmo | Sessão de Leitura | Interação em Listas | Fricção grave? |
|-----|:----------:|:------------------------:|:------------------:|:--------------------:|:---------------:|
| 1   |            |                           |                     |                       |                  |
| 2   |            |                           |                     |                       |                  |
| 3   |            |                           |                     |                       |                  |
| 4   |            |                           |                     |                       |                  |
| 5   |            |                           |                     |                       |                  |
| 6   |            |                           |                     |                       |                  |
| 7   |            |                           |                     |                       |                  |

---

## Perguntas de avaliação (responder ao final dos 7 dias)

1. Em quantos dos 7 dias você abriu o app sem ter sido lembrado por este documento?
2. Houve algum dia em que você quis registrar algo e desistiu pela fricção do app? Qual módulo?
3. A tela Hoje te deu uma visão útil do seu dia, ou você a ignorou?
4. Algum módulo foi claramente mais usado que os outros? Por quê?
5. Algum módulo foi ignorado completamente? Por quê?
6. Você sentiu falta de alguma feature que está fora do escopo do v0.1 (IA, notificações, widgets)? Qual, especificamente, e por quê?
7. O app pareceu rápido o suficiente para uso no dia a dia?
8. Você confiaria nos dados registrados se precisasse consultá-los daqui a um mês?

---

## Critérios de sucesso

O MVP v0.1 é considerado **aprovado** se, ao final dos 7 dias:

- A tela Hoje foi aberta em **todos os 7 dias**.
- Houve **pelo menos 5 registros** em Corpo ou Ritmo (somados).
- Houve **pelo menos 3 sessões** de Leitura.
- Houve **pelo menos 5 interações** em Listas (criar lista, criar item, marcar feito).
- Ocorreram **no máximo 3 momentos de fricção grave** (ver definição abaixo).

### O que conta como "fricção grave"

- O app travou, fechou inesperadamente, ou ficou com loading infinito.
- Um registro foi perdido (criado no app, mas não apareceu depois).
- A pessoa quis fazer algo simples e não conseguiu entender como.
- Um dado apareceu errado (ex: treino de outro dia aparecendo em Hoje).

Fricções leves (ex: "queria que o teclado abrisse mais rápido") não contam para este critério, mas devem ser registradas na tabela de fricções para priorização futura.

---

## Critérios de falha

O MVP v0.1 é considerado **não aprovado** se qualquer um destes ocorrer:

- A tela Hoje não foi aberta em 2 ou mais dos 7 dias.
- Ocorreram 4 ou mais momentos de fricção grave.
- Algum módulo ficou completamente inutilizável em algum momento dos 7 dias (crash persistente, erro não recuperável).
- A pessoa relatou explicitamente "parei de usar porque era mais fácil não usar".

Se o teste falhar, o próximo passo não é adicionar features — é investigar e corrigir a fricção raiz antes de tentar novamente.

---

## Tabela de registro de fricções

Preencher em tempo real, não de memória.

| Dia | Módulo | O que aconteceu | Gravidade (leve/grave) | Ação sugerida |
|-----|--------|------------------|--------------------------|----------------|
|     |        |                  |                          |                |
|     |        |                  |                          |                |
|     |        |                  |                          |                |
|     |        |                  |                          |                |
|     |        |                  |                          |                |

---

## Após os 7 dias

1. Preencher as perguntas de avaliação.
2. Verificar os critérios de sucesso/falha objetivamente — sem otimismo nem pessimismo.
3. Se aprovado: seguir para autenticação real (Supabase Auth) e considerar o MVP fechado.
4. Se não aprovado: revisar a tabela de fricções, identificar o padrão mais recorrente, e tratá-lo antes de qualquer nova feature.
