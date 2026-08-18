/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['studio', 'ai-agent', 'workflow-builder'],

  // ffmpeg-static y ffprobe-static exponen la ruta de un BINARIO calculada con
  // __dirname. Si el bundler los mete en un chunk, esa ruta se reescribe y en
  // produccion apunta a un sitio donde no hay nada:
  //   spawn /app/.next/server/chunks/bin/linux/x64/ffprobe ENOENT
  // Costo dinero real: el video se generaba y se cobraba, y luego el
  // post-proceso moria sin entregar nada. Dejandolos fuera del bundle, se
  // cargan desde node_modules y la ruta del binario vuelve a ser correcta.
  serverExternalPackages: ['ffmpeg-static', 'ffprobe-static', 'fluent-ffmpeg'],
};

export default nextConfig;
