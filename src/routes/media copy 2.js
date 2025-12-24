// routes/media.js
const express = require('express');
const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const ytSearch = require('yt-search');
const hydralerne = require('@hydralerne/youtube-api');


const router = express.Router();
const axios = require('axios');

router.post('/search', async (req, res) => {
  const query = req.body.query;
  const limit = parseInt(req.body.limit) || 20; // Valor por defecto: 5

  try {
    const searchResults = await ytSearch(query);
    const videos = searchResults.videos.slice(0, limit);

    const detalles = videos.map((video) => ({
      titulo: video.title,
      duracion: video.timestamp,
      vistas: video.views,
      autor: video.author.name,
      descripcion: video.description,
      miniatura: video.thumbnail,
      id: video.videoId,
    }));
    console.log(videos)

    res.json(detalles);
  } catch (error) {
    console.error('Error en la búsqueda:', error);
    res.status(500).json({ error: 'No se pudo buscar videos' });
  }
});

router.get('/stream/:videoId', async (req, res) => {
  const videoId = req.params.videoId;
  //const cookiesPath = path.resolve(__dirname, '../public/cookies.txt');

  /*if (!fs.existsSync(cookiesPath)) {
    console.error('Archivo de cookies no encontrado:', cookiesPath);
    return res.status(500).send('Archivo de cookies no disponible');
  }*/

  // 🔍 Obtener URL directa con yt-dlp
  const result = spawnSync('yt-dlp', [
    //'-f', 'best',
    '-f', 'best',
    //'--cookies', cookiesPath,
    '-g',
    `https://www.youtube.com/watch?v=${videoId}`
  ]);

  if (result.status !== 0) {
    console.error('yt-dlp falló al obtener la URL directa');
    console.error(result.stderr.toString());
    return res.status(500).send('No se pudo obtener la URL del video');
  }

  const url = result.stdout.toString().trim();
  if (!url) {
    return res.status(500).send('No se pudo obtener la URL del video');
  }

  // 🎥 Transmitir con ffmpeg
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Accept-Ranges', 'bytes');

  const ffmpeg = spawn('ffmpeg', [
    '-i', url,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-f', 'mp4',
    '-movflags', 'frag_keyframe+default_base_moof', // ✅ CORREGIDO
    'pipe:1'
  ]);

  ffmpeg.stdout.pipe(res);

  ffmpeg.stderr.on('data', data => {
    // Puedes imprimir esto para debug si lo necesitas
    // console.error('ffmpeg stderr:', data.toString());
  });

  ffmpeg.on('close', code => {
    if (code !== 0) {
      console.error('ffmpeg terminó con error:', code);
    }
  });

  ffmpeg.on('error', err => {
    console.error('Error al iniciar ffmpeg:', err);
    if (!res.headersSent) {
      res.status(500).send('Error interno al iniciar ffmpeg');
    }
  });
});


router.get('/download/:videoId', async (req, res) => {
  const videoId = req.params.videoId;
  if (!videoId) return res.status(400).json({ error: 'Missing video URL' });

  const ytDlpPath = '/home/vboxuser/.local/bin/yt-dlp';

  // Obtener metadata para generar nombre de archivo
  const ytDlpInfo = spawn(ytDlpPath, [
    '--no-playlist',
    '--dump-single-json',
    `https://www.youtube.com/watch?v=${videoId}`
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let jsonData = '';
  ytDlpInfo.stdout.on('data', data => jsonData += data.toString());
  ytDlpInfo.stderr.on('data', data => console.error('[yt-dlp info]', data.toString()));

  ytDlpInfo.on('close', code => {
    if (code !== 0) return res.status(500).json({ error: 'yt-dlp info failed' });

    let info;
    try {
      info = JSON.parse(jsonData);
    } catch (err) {
      console.error('Raw yt-dlp output:', jsonData);
      return res.status(500).json({ error: 'yt-dlp did not return valid JSON' });
    }

    const safeTitle = info.title?.replace(/[^\w\s\-]/g, '').replace(/\s+/g, '_') || 'video';
    const outputPath = path.resolve(__dirname, '..', `${safeTitle}.mp4`);

    if (fs.existsSync(outputPath)) {
      return res.json({ success: true, file: outputPath, message: 'File already exists' });
    }

    // Descargar el video directamente al disco
    const ytDlpDownload = spawn(ytDlpPath, [
      '-f', 'best[ext=mp4]/best',
      '--progress',
      '-o', outputPath,
      `https://www.youtube.com/watch?v=${videoId}`
    ], { stdio: ['ignore', 'ignore', 'pipe'] });

    ytDlpDownload.stderr.on('data', data => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.includes('%') || line.includes('ETA')) {
          console.log('[progress]', line.trim());
        } else if (line.includes('Destination')) {
          console.log('[yt-dlp]', line.trim());
        }
      });
    });

    ytDlpDownload.on('close', code => {
      if (code !== 0) {
        console.error(`yt-dlp exited with code ${code}`);
        return res.status(500).json({ error: 'Download failed' });
      }

      res.json({ success: true, file: outputPath });
    });
  });
});



/*
  const ytdl = require('ytdl-core');

try {
  const info = await ytdl.getInfo(videoId, {
    requestOptions: {
      headers: {
        Cookie: 'YOUR_COOKIES_HERE'
      }
    }
  });
  console.log(info.videoDetails);
} catch (err) {
  console.error('Video bloqueado o requiere cookies:', err.message);
}


*/




module.exports = router;
