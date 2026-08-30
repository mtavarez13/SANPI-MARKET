import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  Download,
  X,
  CheckCircle2,
  Terminal,
  Copy,
  Check,
  FolderArchive,
  Flame,
  FileCode,
  ExternalLink,
  Sparkles,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface DownloadZipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadZipModal: React.FC<DownloadZipModalProps> = ({ isOpen, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    setErrorMessage(null);
    setStatusMessage('Preparando y empaquetando archivos del proyecto...');

    const fileName = `sanpi-market-firebase-${new Date().toISOString().slice(0, 10)}.zip`;

    try {
      // Method 1: Fetch binary ZIP directly from Node backend
      setStatusMessage('Generando archivo ZIP en el servidor...');
      const response = await fetch('/api/download-zip', { cache: 'no-store' });

      if (response.ok) {
        const blob = await response.blob();
        if (blob && blob.size > 1000) {
          triggerBlobDownload(blob, fileName);
          setStatusMessage(`¡Descargado con éxito! (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
          setDownloading(false);
          setDownloaded(true);
          return;
        }
      }

      // Method 2: Client-side JSZip Fallback if server stream was interrupted
      setStatusMessage('Generando paquete local con JSZip en el navegador...');
      const bundleRes = await fetch('/api/project-files-bundle', { cache: 'no-store' });
      
      if (!bundleRes.ok) {
        throw new Error(`Error en el servidor (${bundleRes.status})`);
      }

      const { files } = await bundleRes.json();
      if (!files || !Array.isArray(files) || files.length === 0) {
        throw new Error('No se encontraron archivos para empaquetar');
      }

      const zip = new JSZip();
      for (const file of files) {
        if (file.isBinary) {
          // Convert base64 to binary
          zip.file(file.path, file.content, { base64: true });
        } else {
          zip.file(file.path, file.content);
        }
      }

      setStatusMessage(`Comprimiendo ${files.length} archivos...`);
      const clientBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      triggerBlobDownload(clientBlob, fileName);
      setStatusMessage(`¡Descarga completada! (${(clientBlob.size / 1024 / 1024).toFixed(2)} MB)`);
      setDownloading(false);
      setDownloaded(true);
    } catch (err: any) {
      console.error('Error in ZIP download flow:', err);
      setErrorMessage(err.message || 'Error al generar el archivo ZIP. Prueba abriendo el enlace directo o desde AI Studio.');
      setDownloading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const commands = [
    { title: '1. Instalar Firebase CLI (si no lo tienes)', code: 'npm install -g firebase-tools' },
    { title: '2. Iniciar sesión con tu cuenta de Google', code: 'firebase login' },
    { title: '3. Instalar paquetes y compilar proyecto', code: 'npm install && npm run build' },
    { title: '4. Desplegar en Firebase Hosting & Firestore', code: 'firebase deploy' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-950/50 flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Descargar Proyecto ZIP para Firebase
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                  Firebase Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Paquete comprimido con <code className="text-purple-300">firebase.json</code>, <code className="text-purple-300">.firebaserc</code> y <code className="text-purple-300">firestore.rules</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Download Action Card */}
          <div className="bg-gradient-to-br from-purple-900/30 via-slate-800/40 to-slate-900 border border-purple-500/40 rounded-xl p-5 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-3">
              <FolderArchive className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Paquete Completo de la Aplicación
            </h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto mb-4">
              Incluye todo el código fuente React + TypeScript, estilos Tailwind, APIs Express, reglas de Firestore y configuraciones de despliegue directo.
            </p>

            {statusMessage && (
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-950/60 border border-purple-500/30 text-xs text-purple-200">
                {downloading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />}
                {downloaded && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-200 text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Error al descargar:</strong> {errorMessage}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all duration-200 ${
                  downloaded
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-950/50 hover:scale-[1.02]'
                } ${downloading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {downloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Descargando...</span>
                  </>
                ) : downloaded ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>¡Descargar de nuevo!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Descargar Archivo ZIP (.zip)</span>
                  </>
                )}
              </button>

              <a
                href="/api/download-zip"
                target="_blank"
                rel="noopener noreferrer"
                download={`sanpi-market-firebase-${new Date().toISOString().slice(0, 10)}.zip`}
                className="inline-flex items-center gap-1.5 px-4 py-3.5 rounded-xl text-xs font-semibold text-purple-300 bg-purple-950/50 hover:bg-purple-900/50 border border-purple-500/30 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Enlace Directo</span>
              </a>
            </div>
          </div>

          {/* Files included checklist */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-purple-400" />
              Archivos clave incluidos en el ZIP
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong className="text-white">firebase.json</strong> (Hosting y SPA rewrite)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong className="text-white">.firebaserc</strong> (ID del proyecto Firebase)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong className="text-white">firestore.rules</strong> (Reglas de base de datos)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong className="text-white">DEPLOY_FIREBASE.md</strong> (Guía de comandos)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong className="text-white">src/</strong> (Todo el código React + TS)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong className="text-white">package.json</strong> (Scripts y dependencias)</span>
              </div>
            </div>
          </div>

          {/* Step-by-step deploy instructions */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              Pasos para subir a Firebase desde tu Computadora
            </h4>

            {commands.map((cmd, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-300">{cmd.title}</span>
                  <button
                    onClick={() => copyToClipboard(cmd.code, idx)}
                    className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-900/80 px-3 py-2 rounded-lg font-mono text-xs text-purple-300 overflow-x-auto select-all">
                  {cmd.code}
                </pre>
              </div>
            ))}
          </div>

          {/* AI Studio alternative note */}
          <div className="flex items-start gap-3 p-3.5 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs text-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-indigo-100">Alternativa en AI Studio:</strong> También puedes exportar el código en cualquier momento haciendo clic en el menú superior o ajustes de Google AI Studio &gt; <strong>Export to ZIP</strong> o <strong>Export to GitHub</strong>.
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-800 bg-slate-950">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Descargar ZIP</span>
          </button>
        </div>

      </div>
    </div>
  );
};
