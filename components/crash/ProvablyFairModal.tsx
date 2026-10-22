'use client';

import { Check, CheckCircle2, Clock, Lock, ShieldCheck, X, XCircle } from 'lucide-react';
import { useState } from 'react';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  sessionId: string;
  roundHash?: string;
  seed?: string | number;
  salt?: string;
  crashPoint?: number;
  phase: 'betting' | 'flying' | 'crashed';
}

export function ProvablyFairModal({
  isOpen,
  onCloseAction,
  sessionId,
  roundHash,
  seed,
  salt,
  crashPoint,
  phase,
}: ProvablyFairModalProps) {
  const [verificationResult, setVerificationResult] = useState<{
    computedHash: string;
    isMatch: boolean;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleVerify = async () => {
    if (!salt || !seed || !crashPoint || !roundHash) return;

    try {
      const enc = new TextEncoder();
      const keyData = enc.encode(salt);
      const messageData = enc.encode(`${seed}:${Number(crashPoint).toFixed(2)}`);

      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, messageData);
      const hashArray = Array.from(new Uint8Array(signature));
      const computedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      setVerificationResult({
        computedHash,
        isMatch: computedHash.toLowerCase() === roundHash.toLowerCase(),
      });
    } catch (err) {
      console.error('Error verifying HMAC-SHA256:', err);
    }
  };

  const isRevealed = phase === 'crashed' && Boolean(salt && seed && crashPoint);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#1f2937] via-[#1a222e] to-[#181a20] border border-[#374151] rounded-2xl p-4 sm:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.9)] space-y-4 max-h-[90vh] overflow-y-auto">
        {/* بستن مودال */}
        <button
          type="button"
          onClick={onCloseAction}
          className="absolute top-3 left-3 text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* هدر */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 mx-auto rounded-xl bg-yellow-400/10 border border-yellow-400/40 flex items-center justify-center text-2xl shadow-[0_0_18px_rgba(250,204,21,0.2)]">
            <ShieldCheck className="w-6 h-6 text-yellow-400" />
          </div>
          <h3 className="text-base font-extrabold text-white">راستی‌آزمایی منصفانه (Provably Fair)</h3>
          <p className="text-xs text-gray-400 font-mono">
            راند: {sessionId ? `#${sessionId.slice(-6)}` : 'در انتظار راند...'}
          </p>
        </div>

        {/* فیلدهای رمزنگاری */}
        <div className="space-y-2.5 text-xs">
          {/* هش تعهد شده راند */}
          <div className="bg-[#181a20] p-2.5 rounded-xl border border-[#374151]/80">
            <div className="flex justify-between items-center text-gray-400 mb-1">
              <span className="font-bold text-yellow-400/90">هش تعهدشده راند (Round Hash):</span>
              <button
                type="button"
                onClick={() => copyToClipboard(roundHash || '', 'hash')}
                className="text-[11px] text-gray-400 hover:text-yellow-400 cursor-pointer font-mono"
              >
                {copiedField === 'hash' ? (
                  <span className="flex items-center gap-1 text-green-400">
                    <Check className="w-3 h-3" />
                    <span>کپی شد</span>
                  </span>
                ) : (
                  'کپی'
                )}
              </button>
            </div>
            <div className="font-mono text-[11px] text-gray-200 break-all dir-ltr bg-[#121316] p-2 rounded-lg border border-[#374151]/50">
              {roundHash || 'در انتظار دریافت هش از سرور...'}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              این هش پیش از پرتاب موشک به کلاینت داده شده تا ثابت کند نتیجه تغییر نخواهد کرد.
            </p>
          </div>

          {/* سید و نمک */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#181a20] p-2 rounded-xl border border-[#374151]/80">
              <span className="text-gray-400 block mb-1">سید راند (Seed):</span>
              <div className="font-mono text-[11px] text-white dir-ltr font-bold bg-[#121316] p-1.5 rounded border border-[#374151]/50 truncate">
                {seed ? (
                  String(seed)
                ) : (
                  <span className="flex items-center gap-1 text-gray-400">
                    <Lock className="w-3 h-3" />
                    <span>محرمانه</span>
                  </span>
                )}
              </div>
            </div>
            <div className="bg-[#181a20] p-2 rounded-xl border border-[#374151]/80">
              <span className="text-gray-400 block mb-1">ضریب انفجار:</span>
              <div className="font-mono text-[11px] text-yellow-400 dir-ltr font-bold bg-[#121316] p-1.5 rounded border border-[#374151]/50 truncate">
                {crashPoint ? (
                  `${crashPoint.toFixed(2)}x`
                ) : (
                  <span className="flex items-center gap-1 text-gray-400">
                    <Lock className="w-3 h-3" />
                    <span>در حال پرواز</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* نمک (Salt) */}
          <div className="bg-[#181a20] p-2.5 rounded-xl border border-[#374151]/80">
            <div className="flex justify-between items-center text-gray-400 mb-1">
              <span>نمک رمزنگاری (Salt):</span>
              {salt && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(salt, 'salt')}
                  className="text-[11px] text-gray-400 hover:text-yellow-400 cursor-pointer font-mono"
                >
                  {copiedField === 'salt' ? (
                    <span className="flex items-center gap-1 text-green-400">
                      <Check className="w-3 h-3" />
                      <span>کپی شد</span>
                    </span>
                  ) : (
                    'کپی'
                  )}
                </button>
              )}
            </div>
            <div className="font-mono text-[11px] text-gray-300 break-all dir-ltr bg-[#121316] p-2 rounded-lg border border-[#374151]/50">
              {salt ? (
                salt
              ) : (
                <span className="flex items-center gap-1 text-gray-400">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>پس از پایان پرواز و انفجار موشک افشا می‌شود</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* دکمه راستی‌آزمایی */}
        {isRevealed ? (
          <button
            type="button"
            onClick={handleVerify}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-xs sm:text-sm transition-all shadow-[0_0_16px_rgba(250,204,21,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>محاسبه و راستی‌آزمایی هش (Verify HMAC-SHA256)</span>
          </button>
        ) : (
          <div className="p-2.5 rounded-xl bg-[#181a20] border border-yellow-500/30 text-yellow-300 text-center text-xs flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>برای راستی‌آزمایی ریاضی، منتظر بمانید تا موشک منفجر شود و نمک راند افشا گردد.</span>
          </div>
        )}

        {/* نتیجه راستی‌آزمایی */}
        {verificationResult && (
          <div
            className={`p-3 rounded-xl border text-xs space-y-1.5 ${
              verificationResult.isMatch
                ? 'bg-green-950/80 border-green-500/70 text-green-200'
                : 'bg-red-950/80 border-red-500/70 text-red-200'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5">
              {verificationResult.isMatch ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>
                {verificationResult.isMatch
                  ? 'راند ۱۰۰٪ منصفانه است و ضریب قبل از پرتاب قفل شده بوده است.'
                  : 'هش تولید شده با هش تعهد شده همخوانی ندارد!'}
              </span>
            </div>
            <div className="font-mono text-[10px] break-all dir-ltr opacity-90">
              Computed: {verificationResult.computedHash}
            </div>
          </div>
        )}

        {/* راهنما */}
        <div className="bg-[#181a20]/60 p-3 rounded-xl border border-[#374151]/50 text-[11px] text-gray-400 space-y-1 leading-relaxed">
          <p className="font-bold text-gray-300">چگونه کار می‌کند؟</p>
          <p>
            فرمول تعهد: <code className="font-mono text-yellow-400">HMAC-SHA256(seed:crashPoint, salt)</code>
          </p>
          <p>
            سرور ضریب را پیش از شروع بازی محاسبه و هش آن را منتشر می‌کند. چون امکان تغییر سید و ضریب بدون تغییر هش
            وجود ندارد، سرور هرگز نمی‌تواند ضریب را در حین پرواز به ضرر بازیکن تغییر دهد.
          </p>
        </div>
      </div>
    </div>
  );
}
