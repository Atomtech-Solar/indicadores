import { useEffect, useState } from "react";

type Props = {
  message?: string;
  active: boolean;
};

/**
 * Tela de carregamento com barra de progresso (0–100%).
 * Enquanto `active` é true, a barra avança até ~92%; ao concluir, vai a 100%.
 */
export function AuthLoadingScreen({ message = "Carregando…", active }: Props) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!active) {
      setPercent(100);
      return;
    }

    setPercent(0);
    const start = performance.now();
    const durationMs = 2200;
    const maxWhileWaiting = 92;

    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      setPercent(Math.min(maxWhileWaiting, eased * maxWhileWaiting));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  const display = Math.min(100, Math.round(percent));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#024b2e] px-6">
      <img
        src="https://i.ibb.co/pv36YBgf/Ativo-3.png"
        alt="ATOM TECH"
        className="h-14 w-auto object-contain mb-8 opacity-95"
      />
      <p className="text-sm font-medium text-white/90 mb-6">{message}</p>
      <div className="w-full max-w-xs">
        <div className="h-2 rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#23a548] transition-[width] duration-150 ease-out"
            style={{ width: `${display}%` }}
          />
        </div>
        <p className="mt-2 text-center text-xs font-semibold tabular-nums text-white/80">{display}%</p>
      </div>
    </div>
  );
}
