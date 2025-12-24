// routes/media.js
const express = require('express');
const { spawn } = require('child_process');
const path = require("path");
const fs = require('fs');
const ytSearch = require('yt-search');
const hydralerne = require('@hydralerne/youtube-api');
const youtubedl = require("youtube-dl-exec");

const router = express.Router();
const axios = require('axios');

router.post('/search', async (req, res) => {
  const query = req.body.query;
  const limit = parseInt(req.body.limit) || 5; // Valor por defecto: 5

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
router.post("/stream", async (req, res) => {
  const videoId = req.body.videoId;
  const cookiesFile = path.join(__dirname, "..", "downloads/cookies.txt");

  if (!videoId) {
    return res.status(400).json({ error: "Falta el parámetro 'video id'" });
  }

  if (!fs.existsSync(cookiesFile)) {
    return res.status(500).json({ error: "No se encontró cookies.txt" });
  }

  try {
    const info = await youtubedl(`https://www.youtube.com/watch?v=${videoId}`, {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
      cookies: cookiesFile,
    });

    // Filtrar formatos con video y audio
    const candidates = info.formats.filter(f =>
      f.url && f.vcodec !== "none" && f.acodec !== "none"
    );

    if (candidates.length === 0) {
      return res.status(404).json({ error: "No se encontró stream reproducible" });
    }

    // Ordenar por resolución y fps
    candidates.sort((a, b) => {
      if ((b.height || 0) !== (a.height || 0)) {
        return (b.height || 0) - (a.height || 0);
      }
      return (b.fps || 0) - (a.fps || 0);
    });

    // Elegir el mejor
    const chosen = candidates[0];
    console.log(chosen.url)

    res.json({
      title: info.title,
      streamUrl: chosen.url,
      protocol: chosen.protocol,
      ext: chosen.ext,
      resolution: `${chosen.width}x${chosen.height}`,
      fps: chosen.fps,
    });
  } catch (err) {
    console.error(response?.data?.error);
    res.status(200).json({ error: err.message || err });
  }
});


module.exports = router;
