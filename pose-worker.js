// Deteksi pose MediaPipe di thread terpisah, supaya gambar game tetap mulus walau deteksi butuh ~40 ms per frame di HP.
// Pesan masuk : {type:'init', base, model}  lalu  {type:'frame', bitmap, ts, w, h}
// Pesan keluar: {type:'ready', delegate} | {type:'error', message} | {type:'pose', p, w, h}
let landmarker = null;

self.onmessage = async e => {
  const m = e.data;
  if (m.type === 'init') {
    try {
      const { PoseLandmarker, FilesetResolver } = await import(m.base + '/vision_bundle.mjs');
      const files = await FilesetResolver.forVisionTasks(m.base + '/wasm');
      const opts = delegate => ({ baseOptions: { modelAssetPath: m.model, delegate }, runningMode: 'VIDEO', numPoses: 1 });
      let delegate = 'GPU';
      try { landmarker = await PoseLandmarker.createFromOptions(files, opts('GPU')); }
      catch { delegate = 'CPU'; landmarker = await PoseLandmarker.createFromOptions(files, opts('CPU')); }
      self.postMessage({ type: 'ready', delegate });
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err && err.message || err) });
    }
  } else if (m.type === 'frame') {
    let p = null;
    try {
      const lm = landmarker.detectForVideo(m.bitmap, m.ts).landmarks?.[0];
      if (lm) { p = []; for (const q of lm) p.push(q.x, q.y, q.visibility ?? 1); }
    } catch {}
    m.bitmap.close();
    self.postMessage({ type: 'pose', p, w: m.w, h: m.h });
  }
};
