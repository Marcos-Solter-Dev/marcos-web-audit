# Security Policy

## Escopo do projeto

Marcos Web Audit foi projetado como uma ferramenta de auditoria **passiva**. Ele realiza requisições HTTP/HTTPS normais, verifica links, inspeciona HTML, headers e informações TLS. Ele não deve implementar exploração automática, brute force, fuzzing agressivo ou bypass de autenticação.

## Uso responsável

Use a ferramenta apenas em sites que você tem autorização para analisar. Mesmo verificações passivas podem gerar tráfego; ajuste `--pages`, `--max-links` e `--concurrency` de forma responsável.

## Reportando uma vulnerabilidade

Não abra uma issue pública contendo segredos, tokens ou detalhes exploráveis de uma vulnerabilidade ainda não corrigida. Prefira um canal privado do mantenedor/repositório quando disponível.

Inclua, quando possível:

- versão afetada;
- impacto;
- passos mínimos para reproduzir;
- sugestão de correção;
- dados sensíveis devidamente removidos.
