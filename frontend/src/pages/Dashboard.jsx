import React, { useState, useRef } from 'react';
import { 
  Upload, Lock, Unlock, Download, RefreshCw, CheckCircle2, 
  AlertTriangle, Shield, Key, Hash, FileCheck, Copy, Check, Eye, AlertCircle, ArrowDown
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();

  // --- Encryption State ---
  const [encryptFile, setEncryptFile] = useState(null);
  const [encryptPreview, setEncryptPreview] = useState(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptError, setEncryptError] = useState('');
  const [encryptResult, setEncryptResult] = useState(null);
  const [copiedEncSha, setCopiedEncSha] = useState(false);
  const encryptInputRef = useRef(null);

  // --- Decryption State ---
  const [decryptFile, setDecryptFile] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState('');
  const [decryptResult, setDecryptResult] = useState(null);
  const [copiedDecSha, setCopiedDecSha] = useState(false);
  const decryptInputRef = useRef(null);

  // Handle Image Selection for Encryption
  const handleImageSelect = (file) => {
    setEncryptError('');
    setEncryptResult(null);
    if (!file) return;

    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setEncryptError('Unsupported file type. Please upload JPG, PNG, WEBP, or BMP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setEncryptError('File exceeds the 10 MB upload limit.');
      return;
    }

    setEncryptFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setEncryptPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleEncryptSubmit = async (e) => {
    e.preventDefault();
    if (!encryptFile) return;

    setIsEncrypting(true);
    setEncryptError('');

    const formData = new FormData();
    formData.append('file', encryptFile);

    try {
      const res = await api.post('/images/encrypt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEncryptResult(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Encryption failed. Please check the file.';
      setEncryptError(msg);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDownloadSimg = async () => {
    if (!encryptResult) return;
    try {
      let blob;
      if (encryptResult.package_data) {
        // Direct instant download from in-memory encrypted package
        const jsonStr = typeof encryptResult.package_data === 'string'
          ? encryptResult.package_data
          : JSON.stringify(encryptResult.package_data, null, 2);
        blob = new Blob([jsonStr], { type: 'application/json' });
      } else {
        // Normalize URL if it contains /api prefix or not
        const downloadPath = encryptResult.download_url.startsWith('/api/')
          ? encryptResult.download_url.substring(4)
          : encryptResult.download_url;
        const response = await api.get(downloadPath, {
          responseType: 'blob'
        });
        blob = new Blob([response.data], { type: 'application/json' });
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', encryptResult.encrypted_filename || 'encrypted_package.simg');
      document.body.appendChild(link);
      link.click();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      link.remove();
    } catch (err) {
      console.error("Download error:", err);
      alert('Failed to download encrypted package: ' + (err.response?.data?.detail || err.message));
    }
  };

  const resetEncrypt = () => {
    setEncryptFile(null);
    setEncryptPreview(null);
    setEncryptResult(null);
    setEncryptError('');
    if (encryptInputRef.current) encryptInputRef.current.value = '';
  };

  // Handle .simg Package Selection for Decryption
  const handleSimgSelect = (file) => {
    setDecryptError('');
    setDecryptResult(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.simg') && !file.name.toLowerCase().endsWith('.json')) {
      setDecryptError('Please upload a valid .simg encrypted package.');
      return;
    }

    setDecryptFile(file);
  };

  const handleDecryptSubmit = async (e) => {
    e.preventDefault();
    if (!decryptFile) return;

    setIsDecrypting(true);
    setDecryptError('');

    const formData = new FormData();
    formData.append('file', decryptFile);

    try {
      const res = await api.post('/images/decrypt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDecryptResult(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Decryption failed: encrypted data was modified or authentication failed.';
      setDecryptError(msg);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDownloadDecryptedImage = () => {
    if (!decryptResult?.decrypted_data_base64) return;
    try {
      const byteCharacters = atob(decryptResult.decrypted_data_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: decryptResult.original_mime_type });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recovered_${decryptResult.original_filename}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to reconstruct and download image.');
    }
  };

  const resetDecrypt = () => {
    setDecryptFile(null);
    setDecryptResult(null);
    setDecryptError('');
    if (decryptInputRef.current) decryptInputRef.current.value = '';
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'enc') {
      setCopiedEncSha(true);
      setTimeout(() => setCopiedEncSha(false), 2000);
    } else {
      setCopiedDecSha(true);
      setTimeout(() => setCopiedDecSha(false), 2000);
    }
  };

  return (
    <div className="min-h-screen cyber-grid pb-20 pt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Welcome Banner */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Cryptographic Operations Suite
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-blue-900/40 text-cyan-300 border border-cyan-500/30">
              Active Session
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Authenticated operator: <span className="text-slate-200 font-semibold">{user?.full_name}</span> ({user?.email})
          </p>
        </div>
      </div>

      {/* Main Cryptographic Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        
        {/* ================= PANEL 1: ENCRYPT IMAGE ================= */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl glass-glow-blue border border-cyan-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Encrypt Image</h2>
                  <p className="text-xs text-slate-400">AES-256-GCM + RSA-OAEP Key Protection</p>
                </div>
              </div>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                Hybrid Mode
              </span>
            </div>

            {encryptError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                <span>{encryptError}</span>
              </div>
            )}

            {!encryptResult ? (
              <form onSubmit={handleEncryptSubmit}>
                {/* Drag & Drop Upload Zone */}
                <div
                  onClick={() => encryptInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) handleImageSelect(e.dataTransfer.files[0]);
                  }}
                  className="border-2 border-dashed border-slate-700 hover:border-cyan-400/60 rounded-2xl p-6 text-center cursor-pointer transition-all bg-navy-900/40 hover:bg-navy-900/70 group"
                >
                  <input
                    ref={encryptInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.bmp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
                  />

                  {encryptPreview ? (
                    <div className="space-y-4">
                      <div className="relative inline-block max-h-52 overflow-hidden rounded-xl border border-slate-700">
                        <img
                          src={encryptPreview}
                          alt="Preview"
                          className="max-h-52 object-contain mx-auto"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{encryptFile?.name}</p>
                        <p className="text-xs font-mono text-cyan-400">
                          {(encryptFile?.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <p className="text-xs text-slate-400">Click or drop another file to replace</p>
                    </div>
                  ) : (
                    <div className="py-8 space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-200">
                        Drop high-res image here, or <span className="text-cyan-400 underline">browse</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        Supports JPG, PNG, WEBP, BMP (Max 10 MB)
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!encryptFile || isEncrypting}
                  className="w-full mt-6 py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEncrypting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>Generating AES-256 Key & Encrypting...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>ENCRYPT IMAGE</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Encryption Result View */
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3 text-emerald-300">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold">Encryption Successful</h3>
                    <p className="text-xs text-emerald-400/90">
                      Protected package generated: {encryptResult.encrypted_filename}
                    </p>
                  </div>
                </div>

                {/* Cryptographic Specifications Display */}
                <div className="space-y-3 text-xs font-mono bg-navy-900/80 p-4 rounded-xl border border-slate-700/80">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Symmetric Algorithm:</span>
                    <span className="text-cyan-300 font-bold">{encryptResult.algorithm}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Key Encapsulation:</span>
                    <span className="text-purple-300 font-bold">{encryptResult.key_protection}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Original Payload Size:</span>
                    <span className="text-slate-200">{(encryptResult.file_size / 1024).toFixed(2)} KB</span>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-400">SHA-256 Fingerprint:</span>
                      <button
                        onClick={() => copyToClipboard(encryptResult.sha256, 'enc')}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                      >
                        {copiedEncSha ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="text-[10px]">{copiedEncSha ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-300 break-all bg-navy-950 p-2 rounded border border-slate-800">
                      {encryptResult.sha256}
                    </p>
                  </div>
                </div>

                {/* Security Flow Visualization Diagram */}
                <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs">
                  <p className="font-mono text-cyan-300 font-semibold mb-2">Cryptographic Pipeline Summary:</p>
                  <div className="flex flex-col space-y-1 text-slate-300 font-mono text-[11px]">
                    <div className="flex items-center space-x-2">
                      <span className="text-cyan-400">1. Original Image</span>
                      <span>→</span>
                      <span>SHA-256 Calculated</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-cyan-400">2. Fresh AES Key (256-bit)</span>
                      <span>→</span>
                      <span>GCM Authenticated Encryption</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-purple-400">3. AES Key Wrapped</span>
                      <span>→</span>
                      <span>RSA-OAEP Server Public Key</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-400">4. Assembled Container</span>
                      <span>→</span>
                      <span className="font-bold text-white">.simg Package File</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleDownloadSimg}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download .simg Package</span>
                  </button>
                  <button
                    onClick={resetEncrypt}
                    className="py-3 px-4 rounded-xl font-medium text-slate-300 glass-card hover:text-white hover:border-slate-500 flex items-center justify-center space-x-2 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Encrypt Another</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* ================= PANEL 2: DECRYPT IMAGE ================= */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl glass-glow-purple border border-purple-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Decrypt Image</h2>
                  <p className="text-xs text-slate-400">RSA-OAEP Key Recovery + AES-GCM Authentication</p>
                </div>
              </div>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30">
                Verification Mode
              </span>
            </div>

            {decryptError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <h4 className="font-bold">Cryptographic Error:</h4>
                  <p className="text-xs mt-1 leading-relaxed">{decryptError}</p>
                </div>
              </div>
            )}

            {!decryptResult ? (
              <form onSubmit={handleDecryptSubmit}>
                {/* Upload .simg Zone */}
                <div
                  onClick={() => decryptInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) handleSimgSelect(e.dataTransfer.files[0]);
                  }}
                  className="border-2 border-dashed border-slate-700 hover:border-purple-400/60 rounded-2xl p-6 text-center cursor-pointer transition-all bg-navy-900/40 hover:bg-navy-900/70 group"
                >
                  <input
                    ref={decryptInputRef}
                    type="file"
                    accept=".simg,.json"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleSimgSelect(e.target.files[0])}
                  />

                  {decryptFile ? (
                    <div className="py-6 space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/40">
                        <Key className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{decryptFile.name}</p>
                        <p className="text-xs font-mono text-purple-300 mt-1">
                          {(decryptFile.size / 1024).toFixed(2)} KB Secure Container Ready
                        </p>
                      </div>
                      <p className="text-xs text-slate-400">Click or drop another .simg to replace</p>
                    </div>
                  ) : (
                    <div className="py-8 space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-200">
                        Drop <span className="font-mono text-purple-300">.simg</span> package here, or <span className="text-purple-400 underline">browse</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        Accepts official SecureImage encrypted packages (.simg)
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!decryptFile || isDecrypting}
                  className="w-full mt-6 py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDecrypting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>Unwrapping Key & Verifying Integrity...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>DECRYPT IMAGE</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Decryption Result View */
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-300">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold">Decryption Successful</h3>
                      <p className="text-xs text-emerald-400/90">
                        Recovered original: {decryptResult.original_filename}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold tracking-wider">
                    {decryptResult.integrity}
                  </span>
                </div>

                {/* Recovered Image Preview */}
                <div className="relative rounded-xl border border-slate-700 overflow-hidden bg-navy-900/60 p-2 text-center">
                  <img
                    src={`data:${decryptResult.original_mime_type};base64,${decryptResult.decrypted_data_base64}`}
                    alt="Recovered plaintext"
                    className="max-h-48 object-contain mx-auto rounded-lg shadow-md"
                  />
                  <span className="absolute bottom-3 right-3 text-[10px] font-mono bg-navy-950/80 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                    Preview of Recovered Bytes
                  </span>
                </div>

                {/* Hash Comparison Table */}
                <div className="space-y-3 text-xs font-mono bg-navy-900/80 p-4 rounded-xl border border-slate-700/80">
                  <div>
                    <span className="text-slate-400">Original SHA-256 Digest:</span>
                    <p className="text-[11px] text-slate-300 break-all bg-navy-950 p-2 rounded border border-slate-800 mt-1">
                      {decryptResult.original_sha256}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Recovered SHA-256 Digest:</span>
                    <p className="text-[11px] text-cyan-300 break-all bg-navy-950 p-2 rounded border border-cyan-900/40 mt-1">
                      {decryptResult.recovered_sha256}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                    <span className="text-slate-400">Cryptographic Match:</span>
                    <span className="text-emerald-400 font-bold flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>IDENTICAL 256-BIT CHECKSUM</span>
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleDownloadDecryptedImage}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 hover:from-blue-500 hover:to-cyan-500 shadow-md shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Original Image</span>
                  </button>
                  <button
                    onClick={resetDecrypt}
                    className="py-3 px-4 rounded-xl font-medium text-slate-300 glass-card hover:text-white hover:border-slate-500 flex items-center justify-center space-x-2 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Decrypt Another</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ================= SECTION 35: CRYPTOGRAPHIC INFO PANEL ================= */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-700/80">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            How SecureImage Protects Your Image
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl bg-navy-900/60 border border-slate-800">
            <div className="flex items-center space-x-2 text-cyan-400 font-mono font-bold text-sm mb-2">
              <Lock className="w-4 h-4" />
              <span>AES-256-GCM</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Encrypts the image efficiently and provides authenticated encryption. A fresh 256-bit symmetric key and unique nonce are generated for every file.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-navy-900/60 border border-slate-800">
            <div className="flex items-center space-x-2 text-purple-400 font-mono font-bold text-sm mb-2">
              <Key className="w-4 h-4" />
              <span>RSA-OAEP</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Protects the randomly generated AES session key. Utilizes SHA-256 with MGF1 padding to defeat chosen-ciphertext attacks.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-navy-900/60 border border-slate-800">
            <div className="flex items-center space-x-2 text-blue-400 font-mono font-bold text-sm mb-2">
              <Hash className="w-4 h-4" />
              <span>SHA-256</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Creates a fingerprint for verification and audit purposes. Compares post-decryption bytes to guarantee zero corruption.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-navy-900/60 border border-slate-800">
            <div className="flex items-center space-x-2 text-emerald-400 font-mono font-bold text-sm mb-2">
              <Shield className="w-4 h-4" />
              <span>RBAC & Auditing</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Controls access to user and administrator functionality. Prevents unauthorized decryption while maintaining forensic logs.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
