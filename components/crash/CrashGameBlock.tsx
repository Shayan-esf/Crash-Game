import { useStore } from "@/lib/store";
import { Coins, Rocket } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// فایل‌های چندرسانه‌ای
const ROCKET_IMG = "/assets/rocket.png";
const CLOUD_IMG = "/assets/cloud.svg";
const EXPLOSION_IMG = "/assets/explosion.png";
const PLANET1_IMG = "/assets/planet1.png";
const PLANET2_IMG = "/assets/planet2.png";

// افکت‌های صوتی
const SOUND_LAUNCH = "/sounds/launch.mp3";
const SOUND_FLY = "/sounds/fly.mp3";
const SOUND_EXPLOSION = "/sounds/explosion.mp3";
const SOUND_CASHOUT = "/sounds/cashout.mp3";
const SOUND_CLICK = "/sounds/click.mp3";

// فازهای مختلف بازی
const PHASES = {
  BETTING: "betting",
  FLYING: "flying",
  CRASHED: "crashed",
};

// حداقل ارتفاع بوم بازی
const MIN_HEIGHT = 400;

export default function CrashGameBlock() {
  const { user, balance } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState("betting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [timer, setTimer] = useState(0); // میلی‌ثانیه تا پایان شرط‌بندی
  const [wsConnected, setWsConnected] = useState(false);
  const [profile, setProfile] = useState(user);
  const [currentBalance, setCurrentBalance] = useState(balance);

  // اتصال وب‌سوکت، پردازش فازها و همگام‌سازی
  // رندر کنواس، انیمیشن‌ها، افکت‌ها و منابع تصویری
  // رابط ثبت شرط، دکمه‌ها، تایمر و برداشت
  // صداگذاری

  // رندر آزمایشی بوم
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // اندازه واکنش‌گرا
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = Math.max(
      Math.round(width * 0.56),
      MIN_HEIGHT
    );
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // پس‌زمینه
    ctx.clearRect(0, 0, width, height);
    if (phase === PHASES.BETTING) {
      // گرادیان آسمان
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#7ecbff");
      grad.addColorStop(1, "#fff");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      // ابرها، سکو، موشک و ضریب
    } else {
      // فضا
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#0a1833");
      grad.addColorStop(1, "#1e1e1e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      // ستاره‌ها، سیارات، موشک، انفجار و ضریب
    }
    // نمایش ضریب در مرکز
  }, [phase]);

  // منطق وب‌سوکت، مدیریت فازها، تایمر و ضریب

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col bg-[#1E1E1E] rounded-xl shadow-lg overflow-hidden" style={{ minHeight: MIN_HEIGHT + 200 }}>
      {/* سربرگ */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#23272F]">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-yellow-400" />
          <span className="text-lg font-bold text-white">Crash</span>
          <span className={`w-3 h-3 rounded-full mr-2 ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        </div>
        <div className="text-xl font-mono font-bold text-yellow-400 dir-ltr flex items-center gap-1.5">
          <span>{currentBalance.toFixed(0)}</span>
          <Coins className="w-4 h-4 text-yellow-400" />
        </div>
        <div className="flex items-center gap-2">
          {profile?.avatarUrl && (
            <img src={profile.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full border border-gray-600" />
          )}
          <span className="text-white font-medium">{profile?.username || "بازیکن"}</span>
        </div>
      </div>
      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center bg-black">
        <canvas ref={canvasRef} className="w-full h-full block" style={{ minHeight: MIN_HEIGHT }} />
      </div>
      {/* بخش شرط‌بندی و دکمه‌ها */}
      <div className="p-4 bg-[#23272F] border-t border-gray-800">
        <div className="text-center text-white opacity-60">بخش ثبت شرط و رابط کاربری — در حال توسعه</div>
      </div>
    </div>
  );
} 