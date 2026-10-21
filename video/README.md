# Vídeos do Fecha o Mês

Tutorial (~3 min 45 s) e trailer (~1 min) montados em código com [Remotion](https://www.remotion.dev).

1. Suba o servidor (`server`: `PORT=3001 node src/index.js`) e o cliente (`client`: `npx vite --port 5173`).
2. `npm run record` grava o jogo de verdade com robôs (em `footage/`, com cópia em `public/`); `node scripts/record-hud.mjs` grava a barra lateral aberta e o gráfico do patrimônio no meio do ano. Para regravar só um trecho: `ONLY=finished npm run record` (admin, player, finished).
3. As gravações escrevem as marcações de tempo em `src/markers.json`; o roteiro (`src/plan.jsx`) lê dali, então os trechos acompanham a regravação.
4. `npm run audio` gera a música e os efeitos (sintetizados, sem direitos autorais). Se a duração dos vídeos mudar, passe os segundos: `node scripts/audio.mjs 228 59`.
5. `npm run studio` abre o editor; `npm run render:tutorial` e `npm run render:trailer` geram os MP4 em `out/`. As versões `-leve` saem com `ffmpeg -i <video>.mp4 -c:v libx264 -preset slow -crf 28 -c:a aac -b:a 128k <video>-leve.mp4`.

O spoiler (vertical) usa as gravações antigas, guardadas como `public/spoiler-*.webm`.
