# LoopOS — Checklist Visual

Roteiro de validação manual para confirmar que o app está funcionando de
ponta a ponta (mobile → API → banco → mobile) depois de seguir
`docs/local-visual-run.md`.

Marque cada item conforme for testando no Expo Go ou em uma APK instalada.
Não marque um item como concluído sem realmente ter visto o resultado na
tela do dispositivo.

---

## Hoje

- [ ] Tela abre sem erro e sem loading infinito
- [ ] Mostra os dados do seed: treino de hoje, eventos de Ritmo, sessão de
      Leitura, lista atualizada
- [ ] Card de Corpo mostra "10km 4x11" (ou os badges de km/séries)
- [ ] Card de Ritmo mostra "Meditação" e o segundo tracker do seed
- [ ] Card de Leitura mostra o livro e páginas lidas
- [ ] Card de Listas mostra "Leituras 2025" (ou a lista raiz do seed)
- [ ] Pull-to-refresh atualiza a tela sem erro

## Corpo

- [ ] Campo de input aceita texto livre (placeholder "Ex: 10km 4x11")
- [ ] Registrar `10km 4x11` cria um novo treino
- [ ] O treino aparece imediatamente na lista da tela Corpo
- [ ] Voltar para a aba Hoje mostra o novo treino no card de Corpo
- [ ] Excluir um treino remove ele da lista (com confirmação)

## Ritmo

- [ ] Botão "Criar contador" abre o formulário
- [ ] Criar um tracker boolean (ex: "Água") funciona
- [ ] Marcar o tracker como feito hoje funciona
- [ ] Tentar marcar o mesmo tracker de novo no mesmo dia é bloqueado, com
      aviso visível (anti-duplicidade no cliente)
- [ ] Criar um tracker do tipo `count` e registrar um valor numérico funciona
- [ ] Voltar para Hoje mostra o evento registrado

## Leitura

- [ ] Botão "+ Livro" abre o formulário de cadastro
- [ ] Criar um livro com total de páginas funciona
- [ ] Registrar uma sessão de leitura funciona
- [ ] A barra/label de progresso do livro atualiza após a sessão
- [ ] Voltar para Hoje mostra a sessão de leitura registrada
- [ ] Excluir um livro remove ele e suas sessões

## Listas

- [ ] Criar uma lista raiz funciona
- [ ] Abrir a lista e criar um item dentro dela funciona
- [ ] Marcar o item como concluído funciona (visual riscado/check)
- [ ] Expandir o item e criar um subitem funciona
- [ ] Voltar para Hoje mostra a lista como atualizada
- [ ] Excluir um item, e depois excluir a lista raiz, funciona (com aviso de
      que os itens internos também serão removidos)

---

## Resultado

Depois de marcar os itens acima:

- Se **todos** os itens passaram: o app está visualmente validado e pronto
  para o teste de uso real de 7 dias (`docs/validation-7-days.md`).
- Se algum item falhou: anote o módulo, o que aconteceu, e trate como
  fricção grave ou leve conforme os critérios em
  `docs/validation-7-days.md`, antes de seguir para gerar uma APK.

Este checklist não substitui o teste de 7 dias — ele só confirma que o
caminho básico de cada módulo está funcionando antes de começar o uso real.
