'use client';

import { useState } from 'react';
import { VideoInfo, VideoFormat } from '@/types';
import { Search, Download, Music, Video, Loader2, Youtube } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [url, setUrl] = useState('');
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'mp4' | 'mp3'>('mp4');
  const [selectedQuality, setSelectedQuality] = useState<string>(''); // itag
  const [resolutions, setResolutions] = useState<VideoFormat[]>([]);

  const fetchInfo = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setInfo(null);

    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch video info');

      setInfo(data);
      processFormats(data.formats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processFormats = (formats: VideoFormat[]) => {
    // Filter video formats
    // We want unique resolutions. 
    // Prefer mp4 container if available for that resolution, otherwise any.
    // Actually, backend converts everything to MP4/AAC if 'mp4' is requested.
    // So we just need unique heights.

    const uniqueMap = new Map<number, VideoFormat>();

    formats.forEach(f => {
      if (f.hasVideo && f.height) {
        // If resolution not present, add it
        // Or if present, prefer higher bitrate or meaningful qualityLabel
        if (!uniqueMap.has(f.height)) {
          uniqueMap.set(f.height, f);
        } else {
          // Heuristic: keep the one with hasAudio if existing doesn't (saves backend work)
          // But usually high res doesn't have audio.
          // Or just keep the one with higher bitrate?
          const existing = uniqueMap.get(f.height)!;
          // Prefer MP4 container over WebM for simplicity? Backend handles it though.
          if (f.container === 'mp4' && existing.container !== 'mp4') {
            uniqueMap.set(f.height, f);
          }
        }
      }
    });

    const sorted = Array.from(uniqueMap.values()).sort((a, b) => (b.height || 0) - (a.height || 0));
    setResolutions(sorted);
    if (sorted.length > 0) setSelectedQuality(sorted[0].itag.toString());
  };

  const handleDownload = () => {
    if (!info) return;

    // Construct download URL
    const params = new URLSearchParams({
      url: info.url,
      type: mode,
    });

    if (mode === 'mp4') {
      params.append('itag', selectedQuality);
    } else {
      // For MP3, backend chooses best audio.
      // We can pass nothing or dummy itag.
    }

    // Trigger download
    window.location.href = `/api/download?${params.toString()}`;
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-24 relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-3xl space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2"
          >
            <Youtube className="w-12 h-12 text-red-500" />
            <h1 className="text-4xl sm:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              YT Downloader
            </h1>
          </motion.div>
          <p className="text-white/60 text-lg">
            Premium High-Quality Video & Audio Extractor
          </p>
        </div>

        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500" />
          <div className="relative flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
            <Search className="w-6 h-6 text-white/40 ml-4" />
            <input
              type="text"
              placeholder="Paste YouTube Link here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchInfo()}
              className="w-full bg-transparent border-none outline-none text-white px-4 py-3 text-lg placeholder:text-white/20"
            />
            <button
              onClick={fetchInfo}
              disabled={loading}
              className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Start'}
            </button>
          </div>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-400 text-center bg-red-500/10 border border-red-500/20 p-4 rounded-xl"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {info && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass p-6 md:p-8 space-y-6"
            >
              {/* Video Info */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative w-full md:w-1/2 aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/10 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={info.thumbnail} alt={info.title} className="object-cover w-full h-full group-hover:scale-105 transition duration-500" />
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono">
                    {new Date(Number(info.duration) * 1000).toISOString().substr(11, 8).replace(/^00:/, '')}
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <h2 className="text-2xl font-bold line-clamp-2 leading-tight">{info.title}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode('mp4')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${mode === 'mp4' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'bg-white/5 hover:bg-white/10 text-white/60'
                        }`}
                    >
                      <Video className="w-4 h-4" /> Video
                    </button>
                    <button
                      onClick={() => setMode('mp3')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${mode === 'mp3' ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/25' : 'bg-white/5 hover:bg-white/10 text-white/60'
                        }`}
                    >
                      <Music className="w-4 h-4" /> Audio
                    </button>
                  </div>

                  {mode === 'mp4' && (
                    <div className="space-y-2">
                      <label className="text-sm text-white/40 font-medium ml-1">Select Quality</label>
                      <div className="grid grid-cols-2 gap-2">
                        {resolutions.map(res => (
                          <button
                            key={res.itag}
                            onClick={() => setSelectedQuality(res.itag.toString())}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${selectedQuality === res.itag.toString()
                                ? 'bg-white text-black border-white'
                                : 'bg-transparent border-white/10 text-white/60 hover:bg-white/5'
                              }`}
                          >
                            {res.height}p
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {mode === 'mp3' && (
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-center text-white/60 text-sm">
                      Highest Quality Audio (320kbps/192kbps)
                    </div>
                  )}

                  <button
                    onClick={handleDownload}
                    className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-all shadow-xl flex items-center justify-center gap-2 group"
                  >
                    <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Download {mode === 'mp4' ? 'Video' : 'Audio'}
                  </button>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
