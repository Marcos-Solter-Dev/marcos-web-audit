# Qualidade do projeto

Este repositório mantém uma rotina de verificação local antes de releases e mudanças relevantes.

## Comando principal

```bash
npm run verify
```

A rotina verifica:

- sintaxe dos arquivos JavaScript e MJS;
- suíte automatizada de testes;
- integridade do catálogo de regras e da documentação;
- auditoria ponta a ponta em servidor local;
- geração e leitura dos formatos JSON, HTML, Markdown e SARIF;
- consistência de IDs, severidades, scores e resumos;
- padrões comuns de segredos acidentalmente versionados;
- conteúdo do pacote npm;
- instalação do tarball em um diretório limpo e execução dos binários.

## Critério de publicação

Mudanças só devem ser publicadas quando `npm run verify` terminar com exit code `0`.

A ferramenta usa heurísticas e análise passiva; os testes garantem consistência do software, mas não transformam o score de auditoria em certificação de segurança, SEO ou acessibilidade.
