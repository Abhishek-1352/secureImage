import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, Lock, Key, Hash, Users, Activity, FileCheck, 
  ArrowRight, CheckCircle2, Cpu, Database, EyeOff, Layers, Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen cyber-grid pb-20">
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-900/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono uppercase tracking-wider mb-8">
          <Shield className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Computer & Network Security Cryptography Project</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Hybrid Cryptographic System for <br />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Secure Image Encryption & Decryption
          </span>
        </h1>

        <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-300 mb-10 leading-relaxed font-light">
          Protect sensitive images using high-performance <strong className="text-cyan-300 font-semibold">AES-256-GCM</strong> authenticated encryption, with ephemeral session keys armored by <strong className="text-purple-300 font-semibold">RSA-OAEP</strong> public-key cryptography and continuous <strong className="text-blue-300 font-semibold">SHA-256</strong> integrity auditing.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            to={user ? "/dashboard" : "/register"}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5"
          >
            <span>{user ? "Go to Dashboard" : "Get Started Now"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to={user ? "/history" : "/login"}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-medium text-slate-300 glass-card hover:text-white hover:border-slate-500 transition-all"
          >
            {user ? "View Audit History" : "Sign In with Existing Account"}
          </Link>
        </div>

        {/* Cryptographic Workflow Flowchart Banner */}
        <div className="max-w-5xl mx-auto glass-panel p-6 sm:p-8 rounded-2xl glass-glow-blue border border-cyan-500/20 text-left">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 mb-6">
            <div className="flex items-center space-x-3">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                HYBRID CRYPTOGRAPHIC PIPELINE ARCHITECTURE
              </h2>
            </div>
            <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-500/30">
              Zero Raw Key Persistence
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center text-center">
            
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-navy-900/80 border border-slate-700/80">
              <div className="w-10 h-10 mx-auto rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center mb-2">
                <FileCheck className="w-5 h-5" />
              </div>
              <p className="text-xs font-mono text-slate-400 uppercase">Input Payload</p>
              <h4 className="text-sm font-bold text-white mt-1">Original Image</h4>
              <p className="text-[11px] text-slate-400 mt-1">JPG / PNG / WEBP / BMP &lt; 10MB</p>
            </div>

            <div className="hidden md:flex justify-center text-cyan-500 text-xl font-bold">→</div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-navy-900/80 border border-cyan-500/30">
              <div className="w-10 h-10 mx-auto rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2">
                <Lock className="w-5 h-5" />
              </div>
              <p className="text-xs font-mono text-cyan-300 uppercase">Symmetric Cipher</p>
              <h4 className="text-sm font-bold text-white mt-1">AES-256-GCM</h4>
              <p className="text-[11px] text-slate-400 mt-1">Fresh 256-bit key + 96-bit nonce + auth tag</p>
            </div>

            <div className="hidden md:flex justify-center text-purple-400 text-xl font-bold">→</div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-navy-900/80 border border-purple-500/30">
              <div className="w-10 h-10 mx-auto rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2">
                <Key className="w-5 h-5" />
              </div>
              <p className="text-xs font-mono text-purple-300 uppercase">Asymmetric Wrapping</p>
              <h4 className="text-sm font-bold text-white mt-1">RSA-OAEP (2048)</h4>
              <p className="text-[11px] text-slate-400 mt-1">Key armored with SHA-256 + MGF1</p>
            </div>

            <div className="hidden md:flex justify-center text-emerald-400 text-xl font-bold">→</div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-navy-900/80 border border-emerald-500/30">
              <div className="w-10 h-10 mx-auto rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                <Download className="w-5 h-5" />
              </div>
              <p className="text-xs font-mono text-emerald-300 uppercase">Self-Contained Container</p>
              <h4 className="text-sm font-bold text-white mt-1">Secure .simg</h4>
              <p className="text-[11px] text-slate-400 mt-1">Metadata + wrapped key + ciphertext</p>
            </div>

          </div>
        </div>
      </section>

      {/* Security Pillars Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Engineered For Cryptographic Rigor
          </h2>
          <p className="text-slate-400 mt-2">
            Built from scratch adhering to NIST, OWASP, and college CNS curriculum standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: AES-256-GCM */}
          <div className="glass-card p-6 rounded-2xl hover:border-cyan-500/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">AES-256-GCM</h3>
              <span className="text-[10px] font-mono bg-blue-900/40 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">
                Symmetric
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Galois/Counter Mode (GCM) encrypts high-resolution images with authenticated ciphertext and an integrated 16-byte authentication tag, defeating ciphertext tampering and bit-flipping attacks.
            </p>
          </div>

          {/* Card 2: RSA-OAEP */}
          <div className="glass-card p-6 rounded-2xl hover:border-purple-500/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
              <Key className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">RSA-OAEP</h3>
              <span className="text-[10px] font-mono bg-purple-900/40 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded">
                Asymmetric
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Optimal Asymmetric Encryption Padding (OAEP) with SHA-256 and MGF1 securely armors each ephemeral 256-bit AES session key. The RSA private key remains strictly protected on the backend server.
            </p>
          </div>

          {/* Card 3: SHA-256 */}
          <div className="glass-card p-6 rounded-2xl hover:border-cyan-500/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
              <Hash className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">SHA-256 Fingerprinting</h3>
              <span className="text-[10px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
                Integrity
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Pre-encryption and post-decryption digests are generated and compared in real time to guarantee byte-for-byte fidelity and provide transparent proof of uncorrupted reconstruction.
            </p>
          </div>

          {/* Card 4: RBAC */}
          <div className="glass-card p-6 rounded-2xl hover:border-emerald-500/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">Role-Based Access (RBAC)</h3>
              <span className="text-[10px] font-mono bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                Governance
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Separates normal users from administrative operators. Administrators can view system analytics and manage activation states, but are strictly prohibited from viewing user private keys or plaintext images.
            </p>
          </div>

          {/* Card 5: Audit Logging */}
          <div className="glass-card p-6 rounded-2xl hover:border-rose-500/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <Activity className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">Tamper Detection & Auditing</h3>
              <span className="text-[10px] font-mono bg-rose-900/40 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded">
                Forensics
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every encryption, successful decryption, and tampered package rejection is permanently logged with timestamps, IP addresses, and detailed cryptographic verdicts.
            </p>
          </div>

          {/* Card 6: Zero Plaintext Exposure */}
          <div className="glass-card p-6 rounded-2xl hover:border-blue-500/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
              <EyeOff className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">Zero Raw Key Persistence</h3>
              <span className="text-[10px] font-mono bg-blue-900/40 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">
                Confidentiality
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Raw AES session keys exist solely in volatile memory during active encryption/decryption cycles. They are never stored in database tables or returned in unencrypted API responses.
            </p>
          </div>

        </div>
      </section>

      {/* College Viva Defense Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="glass-panel p-8 rounded-2xl border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-3">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>Why Hybrid Cryptography? (Viva Quick Defense)</span>
          </h3>

          <div className="space-y-4 text-sm text-slate-300">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Why not encrypt the image directly with RSA?</strong>
                <p className="text-slate-400 mt-0.5">
                  RSA is computationally intensive and mathematically limited by key size (an RSA-2048 modulus can only encrypt ~190 bytes with OAEP). Encrypting megabytes of image pixels with RSA is computationally prohibitive and architecturally incorrect.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Why not use only AES-256-GCM?</strong>
                <p className="text-slate-400 mt-0.5">
                  Pure symmetric encryption presents a serious key distribution dilemma. Without asymmetric key encapsulation, transmitting or storing the secret AES key requires a pre-shared channel. Hybrid cryptography solves this by using RSA public keys to armor the symmetric key.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Why is AES-GCM preferred over AES-CBC or AES-ECB?</strong>
                <p className="text-slate-400 mt-0.5">
                  ECB mode preserves visual patterns (the classic "ECB Penguin" vulnerability). CBC mode is malleable and vulnerable to padding oracle attacks. AES-GCM is an Authenticated Encryption with Associated Data (AEAD) cipher that guarantees confidentiality and integrity simultaneously.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
