# Vídeos do Fecha o Mês

Tutorial (~2 min) e trailer (~45 s) montados em código com [Remotion](https://www.remotion.dev).

1. Suba o servidor (`server`, porta 3001) e o cliente (`client`, porta 5173).
2. `npm run record` grava o jogo de verdade com robôs (em `footage/`, com cópia em `public/`).
3. `npm run audio` gera a música e os efeitos (sintetizados, sem direitos autorais).
4. `npm run studio` abre o editor; `npm run render:tutorial` e `npm run render:trailer` geram os MP4 em `out/`.

O roteiro (trechos, velocidade, legendas, zoom e sons) fica em `src/plan.jsx`.
