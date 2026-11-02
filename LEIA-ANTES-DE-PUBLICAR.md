# MOCOTÓ — Pacote para Cloudflare Pages + Apps Script

## O que contém
- `public/`: arquivos do site dos clientes e da gerente (sem planilha, segredos e testes).
- `functions/api/mocoto.js`: proxy da API do Google Apps Script.
- `functions/api/feedback.js`: rota de compatibilidade de avaliações.
- `public/assets/apresentacao-demo.mp4`: vídeo reduzido de ~49 MB para ~6,5 MB (H.264, 720×1280), com `faststart`.
- `public/_headers`: alguns cabeçalhos de segurança e cache.

**Não é uma correção completa da auditoria**: a API de avaliação ainda precisa de proteção contra abuso, o cadastro precisa validar a identidade/presença do cliente e o login da gerente continua sujeito a bloqueio global. Use em ambiente de teste, com dados de teste, até concluir correções de segurança e regras de negócio.

## 1 — Prepare o Google Apps Script

**Se você já usa o Mocotó com uma planilha Google:** preserve essa planilha e siga os passos abaixo.

1. Faça backup da planilha Google atual e de `Code.gs`. Não substitua a planilha sem necessidade.
2. Abra a planilha atual -> Extensões -> Apps Script.
3. Atualize o `Code.gs` da instalação existente apenas após conferir compatibilidade e backup.
4. Nas **Propriedades do script**, configure `MANAGER_QUICK_PIN` (4 dígitos). Mantenha `MANAGER_PIN` (senha forte, pelo menos 8 caracteres).
5. Clique em Implantar -> Gerenciar implantações -> Editar implantação existente -> Nova versão -> Implantar.
6. Confirme que é aplicativo da Web, executado como proprietário, com acesso compatível com clientes sem login no Google (normalmente "Qualquer pessoa").
7. Copie a URL terminada em `/exec`. Não use a URL `/dev` para o site público.
8. **Não execute `setup()` novamente na planilha existente.**

**Se você ainda não tem nenhuma planilha funcionando:** crie uma planilha Google NOVA (ou importe o XLSX original, após conferir o cabeçalho), abra Extensões > Apps Script, cole `backend/Code.gs` do **RAR original** no projeto Apps Script e configure suas propriedades. Para uma planilha totalmente nova e vazia, execute `setup()` **uma única vez** para criar as abas e autorizar o acesso; depois faça a primeira implantação como Aplicativo da Web. Este pacote Cloudflare não inclui `Code.gs` justamente para não publicá-lo por engano. Se importar a planilha Excel existente, confira a compatibilidade dos cabeçalhos e faça cópia antes de executar migrações.

## 2 — Envie o pacote ao GitHub
1. Crie repositório privado (por exemplo, `mocoto-site`) em https://github.com/new.
2. Extraia este ZIP e envie os **arquivos e pastas de dentro do ZIP**, não o ZIP inteiro: `public/`, `functions/`, `.gitignore` e este README.
3. Verifique que nenhum `Code.gs`, arquivo `SENHA`, planilha XLSX ou token foi enviado.
4. Confirme a branch `main`.

## 3 — Configure Cloudflare Pages
1. Acesse https://dash.cloudflare.com/ -> Workers & Pages -> Create application -> Pages -> Connect to Git.
2. Selecione o repositório e a branch `main`.
3. Framework: None; Build command: `exit 0`; Build output directory: `public`.
4. Publique.
5. Em **Settings -> Variables and Secrets**, crie a variável de ambiente de produção:
   - Nome: `MOCOTO_APPS_SCRIPT_URL`
   - Valor: `https://script.google.com/macros/s/.../exec` (sua URL completa)
6. Faça um **novo deployment** após adicionar a variável (deploy/redeploy) para a função enxergá-la.

## 4 — Teste ANTES de compartilhar com clientes
- `https://SEU-PROJETO.pages.dev/`: site público, menu, vídeo e idiomas.
- `https://SEU-PROJETO.pages.dev/gerente.html`: login e emissão de código de visita com PIN de teste.
- Teste uma conta **fictícia**, código e resgate; confirme todas as linhas criadas no Google Sheets.
- Teste avaliação e verifique planilha/alerta com números de teste.
- Ao abrir /api/mocoto no navegador (GET), deve receber um JSON de método não permitido (405), não uma tela HTML.

## Atenção
- Não configure no `config.js` uma URL do Google Script diretamente: `loyalty.apiUrl` deve continuar `/api/mocoto`.
- `functions/` não pode ficar dentro de `public/` quando usar a integração Git.
- Arrastar uma pasta com `functions/` no painel de upload direto do Pages não compila as Pages Functions; use **GitHub conectado** ou Wrangler CLI.
- Não publique o arquivo RAR original: ele contém material privado e um arquivo com aparência de senha.
- O arquivo `Code.gs` não deve ser enviado ao site público; ele deve permanecer no projeto privado Google Apps Script.
- Não há senha ou URL Apps Script embutida neste ZIP; configurar no painel.
- O endereço `/gerente.html` só fica fora dos buscadores; isso **não** constitui controle de acesso.
