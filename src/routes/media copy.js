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
    console.error(err);
    res.status(500).json({ error: err.message || err });
  }
});
/*
router.post("/stream", async (req, res) => {
  const videoId = req.body.videoId;
  const cookiesFile = path.join(__dirname, "..", "downloads/cookies.txt");

  if (!videoId) {
    console.log()
    return res.status(400).json({ error: "Falta el parámetro 'video id'" });
  }

  if (!fs.existsSync(cookiesFile)) {
    return res.status(500).json({ error: "No se encontró cookies.txt" });
  }

  try {
    const info = await youtubedl(`https://www.youtube.com/watch?v=${videoId}`, {
      dumpSingleJson: true,
      noWarnings: true,
      //noCallHome: true,
      preferFreeFormats: true,
      cookies: cookiesFile, // cookies inyectadas
    });

    let chosen = info.formats.find(f =>
      f.url && (f.protocol === "m3u8" || f.protocol === "m3u8_native")
    ) || info.formats.find(f =>
      f.url && f.vcodec !== "none" && f.acodec !== "none" && f.ext === "mp4"
    );

    if (!chosen) {
      return res.status(404).json({ error: "No se encontró stream reproducible" });
    }

    res.json({
      title: info.title,
      streamUrl: chosen.url,
      protocol: chosen.protocol,
      ext: chosen.ext
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
})*/
// Función auxiliar para correr ffmpeg y esperar a que termine
/*function runFfmpeg(args, outputFile) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stderr.on("data", (data) => {
      console.log("ffmpeg:", data.toString());
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(outputFile);
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}*/
/*
router.get("/videoInfo/:videoId", async (req, res) => {
  const videoId = req.params.videoId;

  if (!videoId) {
    return res.status(400).json({ error: "Falta el parámetro 'video id'" });
  }
  const cookiesFile = path.join(__dirname, "..", "cookies.txt");
  if (!fs.existsSync(cookiesFile)) {
    console.error("No se encontró cookies.txt en:", cookiesFile);
  }
  try {


    const info = await youtubedl(`https://www.youtube.com/watch?v=${videoId}`, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      cookies: cookiesFile,   // <-- aquí se inyectan las cookies
    });

    const getHeight = (f) => {
      if (!f) return 0;
      if (typeof f.height === "number" && f.height > 0) return f.height;
      if (f.resolution) {
        const m = String(f.resolution).match(/(\d+)\s*x\s*(\d+)/i);
        if (m) return parseInt(m[2], 10) || parseInt(m[1], 10);
      }
      if (f.format_note) {
        const m = String(f.format_note).match(/(\d+)p/);
        if (m) return parseInt(m[1], 10);
      }
      return 0;
    };

    const videoFormats = (info.formats || []).filter(
      (f) => f && f.url && (f.vcodec !== "none" || getHeight(f) > 0)
    );

    if (videoFormats.length === 0) {
      return res.status(404).json({ error: "No se encontraron formatos de video con URL" });
    }

    let best = null;
    for (const f of videoFormats) {
      const h = getHeight(f);
      const hasAudio = f.acodec && f.acodec !== "none";
      if (!best) {
        best = { f, h, hasAudio };
        continue;
      }
      if (h > best.h) {
        best = { f, h, hasAudio };
        continue;
      }
      if (h === best.h && hasAudio && !best.hasAudio) {
        best = { f, h, hasAudio };
      }
    }

    const formatDuration = (s) => {
      if (s == null || isNaN(Number(s))) return null;
      const sec = Math.floor(Number(s));
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const ss = sec % 60;
      return (h > 0 ? String(h).padStart(2, "0") + ":" : "") +
        String(m).padStart(2, "0") + ":" +
        String(ss).padStart(2, "0");
    };

    const chosen = best.f;

    // 🔹 Generar nombres de archivo en carpeta downloads
    const downloadsDir = path.join(__dirname, "..", "downloads");
    const mp3File = path.join(downloadsDir, `${videoId}.mp3`);
    const mp4File = path.join(downloadsDir, `${videoId}.mp4`);

    // 🔹 Esperar a que ffmpeg termine
    await runFfmpeg(["-y", "-i", chosen.url, "-vn", "-c:a", "mp3", mp3File], mp3File);
    await runFfmpeg(["-y", "-i", chosen.url, "-c", "copy", mp4File], mp4File);

    res.status(200).json({
      title: info.title,
      uploader: info.uploader,
      duration: info.duration,
      duration_hms: formatDuration(info.duration),
      duration_ms: info.duration != null ? Math.round(Number(info.duration) * 1000) : null,
      thumbnail: info.thumbnail,
      bestVideo: {
        format_id: chosen.format_id || chosen.format,
        ext: chosen.ext || null,
        resolution: chosen.resolution || (chosen.width && chosen.height ? `${chosen.width}x${chosen.height}` : null),
        width: chosen.width || null,
        height: chosen.height || getHeight(chosen) || null,
        fps: chosen.fps || null,
        filesize: chosen.filesize || chosen.filesize_approx || null,
        url: chosen.url,
      },
      // 🔹 URLs públicas para descargar (sirve express.static)
      mp3Url: `/${videoId}.mp3`,
      mp4Url: `/${videoId}.mp4`,
    });
  } catch (error) {
    console.error("Error al extraer info:", error);
    res.status(500).json({ error: "No se pudo extraer la información del video" });
  }
});*/





/*
router.get('/download', async (req, res) => {
  const videoURL = req.query.url;
  if (!videoURL) return res.status(400).json({ error: 'Missing video URL' });

  const ytDlpPath = '/home/vboxuser/.local/bin/yt-dlp';

  // Obtener metadata para generar nombre de archivo
  const ytDlpInfo = spawn(ytDlpPath, [
    '--no-playlist',
    '--dump-single-json',
    videoURL
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
      videoURL
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
*/




/*
router.get('/convert', async (req, res) => {
  const videoURL = req.query.url;
  if (!videoURL) return res.status(400).json({ error: 'Missing video URL' });

  const ytDlpPath = '/home/vboxuser/.local/bin/yt-dlp';
  const ytDlp = spawn(ytDlpPath, [
    '--no-playlist',
    '--dump-single-json',
    videoURL
  ]);

  let jsonData = '';
  ytDlp.stdout.on('data', data => jsonData += data.toString());
  ytDlp.stderr.on('data', data => console.error('yt-dlp error:', data.toString()));

  ytDlp.on('close', code => {
    if (code !== 0) return res.status(500).json({ error: 'yt-dlp failed' });

    try {
      const info = JSON.parse(jsonData);
      const formats = info.formats || [];

      // 🔍 Filtrar todos los streams HLS con resolución definida
      const hlsStreams = formats.filter(f =>
        f.format_id.includes('hls') &&
        f.url.endsWith('.m3u8') &&
        f.width && f.height
      );

      // 📊 Ordenar por resolución descendente (mayor calidad primero)
      const bestHls = hlsStreams.sort((a, b) =>
        (b.width * b.height) - (a.width * a.height)
      )[0];

      if (!bestHls) return res.status(404).json({ error: 'No .m3u8 stream with resolution found' });

      const ffmpeg = spawn('ffmpeg', [
        '-i', bestHls.url,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-f', 'mp4',
        '-movflags', 'frag_keyframe+empty_moov',
        'pipe:1'
      ]);

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'inline');

      ffmpeg.stdout.pipe(res);
      ffmpeg.stderr.on('data', data => console.error('ffmpeg error:', data.toString()));
      ffmpeg.on('close', code => {
        if (code !== 0) res.status(500).end('Conversion failed');
      });
    } catch (err) {
      console.error('JSON parse error:', err);
      res.status(500).json({ error: 'Failed to parse yt-dlp output' });
    }
  });
});*/

router.get('/convert', async (req, res) => {
  const videoURL = req.query.url;
  if (!videoURL) return res.status(400).json({ error: 'Missing video URL' });

  const ytDlpPath = '/home/vboxuser/.local/bin/yt-dlp';

  const ytDlp = spawn(ytDlpPath, [
    '--no-playlist',
    '--dump-single-json',
    videoURL
  ]);

  let jsonData = '';
  ytDlp.stdout.on('data', data => jsonData += data.toString());
  ytDlp.stderr.on('data', data => console.error('yt-dlp error:', data.toString()));

  ytDlp.on('close', code => {
    if (code !== 0) return res.status(500).json({ error: 'yt-dlp failed' });

    try {
      const info = JSON.parse(jsonData);
      const formats = info.formats || [];

      // Filtrar todos los streams HLS con resolución definida
      const hlsStreams = formats.filter(f =>
        f.format_id.includes('hls') &&
        f.url.endsWith('.m3u8') &&
        f.width && f.height
      );

      // Ordenar por resolución descendente (mayor calidad primero)
      const bestHls = hlsStreams.sort((a, b) =>
        (b.width * b.height) - (a.width * a.height)
      )[0];

      if (!bestHls) return res.status(404).json({ error: 'No .m3u8 stream with resolution found' });

      // Preparar nombre de archivo limpio
      const safeTitle = info.title?.replace(/[^\w\s\-]/g, '').replace(/\s+/g, '_') || 'video';

      // Ejecutar ffmpeg para convertir el stream
      const ffmpeg = spawn('ffmpeg', [
        '-i', bestHls.url,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-f', 'mp4',
        '-movflags', 'frag_keyframe+empty_moov',
        'pipe:1'
      ]);

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);

      ffmpeg.stdout.pipe(res);

      ffmpeg.stderr.on('data', data => {
        const msg = data.toString();
        console.error('ffmpeg error:', msg);
      });

      ffmpeg.on('close', code => {
        if (code !== 0) {
          console.error(`ffmpeg exited with code ${code}`);
          res.status(500).end('Conversion failed');
        }
      });
    } catch (err) {
      console.error('JSON parse error:', err);
      res.status(500).json({ error: 'Failed to parse yt-dlp output' });
    }
  });
});









// Ruta: /media/info?url=https://youtube.com/...
router.get('/info/:videoID', async (req, res) => {
  const videoID = req.params.videoID;
  if (!videoID) return res.status(400).json({ error: 'Missing URL parameter' });

  const ytDlpPath = '/home/vboxuser/.local/bin/yt-dlp';

  /*
  
    const ytDlp = spawn(ytDlpPath, [
'--dump-single-json',
`https://youtube.com/watch?v=${videoID}`
]);

  * */

  // Comando para obtener info en JSON
  const ytDlp = spawn(ytDlpPath, [
    '--no-playlist',
    '-f', 'bestaudio[ext=m4a]/bestaudio',
    '-j',
    '--print-json',
    `https://youtube.com/watch?v=${videoID}`
  ]);


  let jsonData = '';
  ytDlp.stdout.on('data', (data) => {
    jsonData += data.toString();
  });

  ytDlp.stderr.on('data', (data) => {
    console.error('yt-dlp error:', data.toString());
  });

  ytDlp.on('close', (code) => {
    if (code !== 0) return res.status(500).json({ error: 'yt-dlp failed' });

    try {
      const info = JSON.parse(jsonData);
      const formats = info.formats || [];

      const bestAudio = formats
        .filter(f => f.vcodec === 'none' && f.acodec !== 'none' && f.url) // solo audio
        .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0]; // mayor bitrate

      const audioInfo = bestAudio ? {
        format_id: bestAudio.format_id,
        ext: bestAudio.ext,
        acodec: bestAudio.acodec,
        abr: bestAudio.abr,
        filesize: bestAudio.filesize,
        url: bestAudio.url,
      } : null;


      /*const videoResolutions = formats
          .filter(f => f.vcodec !== 'none') // Solo formatos con video
          .map(f => ({
              format_id: f.format_id,
              resolution: f.resolution || `${f.width}x${f.height}`,
              ext: f.ext,
              fps: f.fps,
              note: f.format_note,
              filesize: f.filesize,
          }));*/

      const videoWithAudio = formats
        .filter(f => f.vcodec !== 'none' && f.acodec !== 'none') // Solo formatos con video y audio
        .map(f => ({
          format_id: f.format_id,
          resolution: f.resolution || `${f.width}x${f.height}`,
          ext: f.ext,
          fps: f.fps,
          note: f.format_note,
          filesize: f.filesize,
          url: f.url, // 🔥 Aquí está la URL directa del stream
          audio_bitrate: f.abr,
          video_bitrate: f.vbr,
        }));




      const audioMp3 = formats.find(f =>
        f.acodec !== 'none' &&
        f.vcodec === 'none' &&
        f.ext === 'mp3'
      );

      res.json({
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        audio_mp3: audioInfo || 'No audio found',
        //video_resolutions: videoResolutions,
        video_with_audio: videoWithAudio,

      });
    } catch (err) {
      console.error('JSON parse error:', err);
      res.status(500).json({ error: 'Failed to parse yt-dlp output' });
    }
  });
});

router.get('/other', async (req, res) => {
  const videoURL = req.query.url;
  if (!videoURL) return res.status(400).json({ error: 'Missing URL parameter' });

  const ytDlpPath = '/home/vboxuser/.local/bin/yt-dlp';

  const ytDlp = spawn(ytDlpPath, [
    '--no-playlist',
    '--dump-single-json',
    videoURL
  ]);

  let jsonData = '';
  ytDlp.stdout.on('data', (data) => {
    jsonData += data.toString();
  });

  ytDlp.stderr.on('data', (data) => {
    console.error('yt-dlp error:', data.toString());
  });

  ytDlp.on('close', (code) => {
    if (code !== 0) return res.status(500).json({ error: 'yt-dlp failed' });

    try {
      const info = JSON.parse(jsonData);
      const formats = info.formats || [];

      const videoOnly = formats
        .filter(f => f.vcodec !== 'none' && f.acodec === 'none' && f.url)
        .map(f => ({
          format_id: f.format_id,
          resolution: f.resolution || `${f.width}x${f.height}`,
          ext: f.ext,
          fps: f.fps,
          note: f.format_note,
          filesize: f.filesize,
          url: f.url,
          video_bitrate: f.vbr,
        }));

      const videoWithAudio = formats
        .filter(f => f.vcodec !== 'none' && f.acodec !== 'none' && f.url)
        .map(f => ({
          format_id: f.format_id,
          resolution: f.resolution || `${f.width}x${f.height}`,
          ext: f.ext,
          fps: f.fps,
          note: f.format_note,
          filesize: f.filesize,
          url: f.url,
          audio_bitrate: f.abr,
          video_bitrate: f.vbr,
        }));

      res.json({
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        video_only: videoOnly,
        video_with_audio: videoWithAudio,
      });
    } catch (err) {
      console.error('JSON parse error:', err);
      res.status(500).json({ error: 'Failed to parse yt-dlp output' });
    }
  });
});


router.get('/audio/:videoID', async (req, res) => {
  const videoID = req.params.videoID;
  if (!videoID) return res.status(400).json({ error: 'Missing video ID' });

  const ytDlpPath = '/home/vboxuser/.local/bin/yt-dlp';

  const ytDlp = spawn(ytDlpPath, [
    '--no-playlist',
    '--prefer-ffmpeg',
    '-f', 'bestaudio[ext=m4a]/bestaudio',
    '--extract-audio',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '--external-downloader-args', 'ffmpeg_i:-buffer_size 64M',
    '--user-agent', 'Mozilla/5.0',
    '--geo-bypass',
    '-o', '-', // salida por stdout
    `https://youtube.com/watch?v=${videoID}`
  ]);

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Disposition', `inline; filename="${videoID}.mp3"`);

  ytDlp.stdout.pipe(res);

  ytDlp.stderr.on('data', (data) => {
    console.error('yt-dlp error:', data.toString());
  });

  ytDlp.on('close', (code) => {
    if (code !== 0) {
      res.status(500).json({ error: 'yt-dlp failed to extract audio' });
    }
  });
});


module.exports = router;
