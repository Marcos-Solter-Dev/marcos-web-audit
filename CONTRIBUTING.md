# Contribuindo

Obrigado pelo interesse no Marcos Web Audit.

## Antes de contribuir

A licença do projeto não permite republicar o repositório em outra conta ou serviço. Por isso, não crie um fork para manter ou redistribuir uma cópia do projeto.

Se você encontrou um bug ou tem uma ideia de melhoria, abra uma issue explicando o que precisa ser ajustado. Se você já tiver acesso de escrita ao repositório oficial, trabalhe em uma branch separada e abra um Pull Request normalmente.

## Fluxo básico

1. Descreva o bug ou a melhoria em uma issue.
2. Faça uma mudança pequena e focada no repositório oficial quando houver autorização/acesso.
3. Adicione ou atualize os testes necessários.
4. Rode `npm run check`, `npm run verify:rules` e `npm run verify:docs`.
5. Antes de abrir o PR, rode `npm run verify`.
6. No Pull Request, explique de forma simples o problema e o que foi alterado.

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
- `fail`: problema forte ou objetivo que merece prioridade.

## Estilo

O projeto usa JavaScript ESM e APIs nativas do Node.js. Evite dependências novas quando a plataforma já oferece uma solução simples e segura.
