# Contribuindo

Obrigado pelo interesse no Marcos Web Audit.

## Fluxo básico

1. Crie um fork ou branch.
2. Faça uma mudança pequena e focada.
3. Adicione/atualize testes.
4. Rode `npm run check`, `npm run verify:rules` e `npm run verify:docs`.
5. Antes de abrir o PR, rode `npm run verify`.
6. Abra um Pull Request explicando o problema e a solução.

## Regras para novas auditorias

Uma auditoria deve:

- ser passiva e previsível;
- evitar tráfego excessivo;
- explicar por que um achado importa;
- fornecer recomendação quando for possível agir;
- evitar marcar como falha algo que depende fortemente do contexto;
- incluir testes para casos aprovados e problemáticos.

## Severidades

- `pass`: configuração esperada encontrada;
- `info`: informação útil sem indicar erro;
- `warning`: melhoria recomendada ou risco contextual;
- `fail`: problema forte/objetivo que merece prioridade.

## Estilo

O projeto usa JavaScript ESM e APIs nativas do Node.js. Evite dependências novas quando a plataforma já oferece uma solução simples e segura.
