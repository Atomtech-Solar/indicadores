import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  UserPlus,
  User,
  Send,
  Wallet,
  Handshake,
  DollarSign,
  GraduationCap,
  Clock3,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  TrendingUp,
  Users,
  Facebook,
  Linkedin,
  Instagram,
  Twitter,
  Menu,
  X,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import ativoLogoImage from "../../img/Ativo 1.png";
import downArrowImage from "../../img/down-arrow.png";

const CELULAR_HERO_URL = "https://i.ibb.co/Lzb68BpJ/Celular-Hero.png";
const CTA_CADASTRO_URL = "https://i.ibb.co/3YF41xdm/CTA-Cadastro.png";
const FECHADO_URL = "https://i.ibb.co/RTdgWXb3/Fechado.png";
const NAV_LINKS = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Resultados", href: "#prova" },
  { label: "Por que funciona", href: "#objeções" },
  { label: "Dúvidas", href: "#duvidas" },
  { label: "Começar", href: "#cta-final" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ATOM TECH — Ganhe dinheiro indicando pessoas ou empresas" },
      {
        name: "description",
        content:
          "Indique pessoas ou empresas com a ATOM TECH e receba comissão por cada negócio fechado. Simples, rápido e transparente.",
      },
      { property: "og:title", content: "ATOM TECH — Ganhe indicando" },
      {
        property: "og:description",
        content: "Você indica. A ATOM TECH fecha. Você recebe comissão.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [splashPhase, setSplashPhase] = useState<"loading" | "reveal" | "ready">("loading");

  useEffect(() => {
    const toReveal = window.setTimeout(() => setSplashPhase("reveal"), 2200);
    const toReady = window.setTimeout(() => setSplashPhase("ready"), 2600);
    return () => {
      window.clearTimeout(toReveal);
      window.clearTimeout(toReady);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  if (splashPhase !== "ready") {
    return <AuthLoadingScreen active={splashPhase === "loading"} message="Carregando…" />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img
              src={ativoLogoImage}
              alt="ATOM TECH"
              className="h-10 w-auto object-contain"
            />
          </Link>
          <nav className="hidden min-[901px]:flex items-center gap-8 text-sm text-muted-foreground">
            {NAV_LINKS.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-foreground transition">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden min-[901px]:flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" className="rounded-xl text-muted-foreground">
                Entrar
              </Button>
            </Link>
            <Link to="/cadastro">
              <Button variant="default" className="rounded-xl">
                Começar
              </Button>
            </Link>
          </div>
          <button
            type="button"
            className="min-[901px]:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground transition hover:bg-muted"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div
        className={`min-[901px]:hidden fixed inset-0 z-40 transition-all duration-300 ${
          isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Fechar menu"
          className={`absolute inset-0 bg-black/35 transition-opacity duration-300 ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <aside
          className={`absolute right-0 top-0 h-full w-[84vw] max-w-sm bg-white shadow-2xl transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-16 px-4 border-b border-border flex items-center justify-between">
            <img src={ativoLogoImage} alt="ATOM TECH" className="h-9 w-auto object-contain" />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="px-4 py-5 flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 text-base font-medium text-[#1F2937] hover:bg-green-50 hover:text-[#1B8F3A] transition"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="px-4 pb-6 grid gap-3">
            <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full rounded-xl">
                Entrar
              </Button>
            </Link>
            <Link to="/cadastro" onClick={() => setIsMobileMenuOpen(false)}>
              <Button className="w-full rounded-xl bg-[#1B8F3A] hover:bg-[#177A33]">
                Começar
              </Button>
            </Link>
          </div>
        </aside>
      </div>

      {/* Hero */}
      <section className="relative bg-white overflow-hidden max-[900px]:min-h-[calc(100vh-64px)]">
        <div className="absolute inset-0 -z-10 opacity-50"
             style={{ backgroundImage: "radial-gradient(circle at 20% 20%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 50%)" }} />
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid min-[1061px]:grid-cols-2 gap-12 items-center max-[1060px]:justify-items-center max-[900px]:min-h-[calc(100vh-64px)] max-[900px]:place-content-center">
          <div className="px-2 py-4 md:px-0 md:py-2 max-[1060px]:text-center">
            <div className="inline-flex items-center justify-center rounded-full border border-[#A5D6A7] bg-[#E8F5E9] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#2E7D32] mb-6">
              Sem investimento • Sem experiência • <span className="text-[#1B8F3A]">100% online</span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-[56px] max-[900px]:text-5xl max-[600px]:text-[42px] max-[400px]:text-4xl max-[360px]:text-[34px] font-black leading-[0.98] tracking-[-0.015em] uppercase">
              <span className="block text-[#111111]">Ganhe dinheiro</span>
              <span className="block text-[#1B8F3A]">Indicando pessoas</span>
              <span className="block text-[#1B8F3A]">ou empresas</span>
            </h1>
            <div className="mt-5 relative inline-flex items-center pr-16 md:pr-20 max-[1060px]:pr-14 max-[1060px]:mx-auto">
              <p className="inline-flex -rotate-[1deg] rounded-md bg-[#FBC02D] px-4 py-2 text-sm md:text-xl max-[600px]:text-base max-[440px]:text-[11px] max-[400px]:text-xs max-[360px]:text-[10px] font-black uppercase leading-none text-black shadow-sm">
                Qualquer pessoa pode começar!
              </p>
              <img
                src={downArrowImage}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -top-11 -right-8 max-[800px]:-right-12 max-[500px]:!-right-3 max-[440px]:hidden md:-right-10 h-14 w-14 md:h-16 md:w-16 object-contain rotate-[30deg]"
              />
            </div>
            <p className="mt-6 text-base md:text-xl max-[600px]:text-lg max-[400px]:text-sm max-[360px]:text-xs leading-snug text-[#333333] max-w-xl max-[1060px]:mx-auto">
              Você indica, nós fechamos e você recebe <span className="font-semibold text-[#1B8F3A]">comissão</span> por cada negócio fechado.
              <br />
              <span className="text-[#666666] text-base md:text-lg max-[600px]:text-base max-[400px]:text-sm max-[360px]:text-xs">Simples, transparente e sem precisar vender.</span>
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center max-[1060px]:justify-center max-[1060px]:items-center">
              <Link to="/cadastro">
                <Button
                  size="lg"
                  className="rounded-full h-12 px-6 text-sm font-bold uppercase bg-[#1B8F3A] hover:bg-[#177A33] text-white shadow-[0_8px_16px_-8px_rgba(27,143,58,0.7)]"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Quero começar a ganhar agora
                </Button>
              </Link>
              <a href="#como-funciona">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full h-12 px-6 text-sm font-bold uppercase border-[#1B8F3A] text-[#1B8F3A] bg-transparent hover:bg-[#1B8F3A]/10"
                >
                  Ver como funciona
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm max-[400px]:text-xs max-[360px]:text-[10px] text-muted-foreground max-[1060px]:justify-center">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Cadastro grátis</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Pagamento garantido</div>
            </div>
          </div>

          <div className="relative flex justify-center min-[1061px]:justify-end max-[1060px]:items-center max-[1060px]:w-full">
            <img src={CELULAR_HERO_URL} alt="Prévia do aplicativo no celular" className="w-full max-w-[420px] h-auto object-contain" />
          </div>
        </div>
      </section>

      <section className="px-4 md:px-6 py-5 bg-[#FAFAFA] border-y border-black/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1.35fr] gap-4 md:gap-5 items-center justify-items-center lg:justify-items-stretch">
            <BenefitItem icon={Users} text="Para qualquer pessoa" className="lg:-translate-y-1" />
            <BenefitItem icon={Handshake} text="Indique pessoas ou empresas" className="lg:translate-y-1" />
            <BenefitItem icon={DollarSign} text="Receba comissão por cada negócio" className="lg:-translate-y-0.5" />
            <BenefitItem icon={ShieldCheck} text="Total segurança e transparência" className="lg:translate-y-1.5" />

            <div className="col-span-2 lg:col-span-1 justify-self-center lg:justify-self-auto lg:ml-2 flex items-center gap-3 rounded-2xl px-3 py-2">
              <div className="h-11 w-11 rounded-full bg-[#1B8F3A] grid place-items-center shrink-0">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-xs text-[#666666]">Já pagamos mais de</p>
                <p className="text-[28px] md:text-[30px] font-bold text-[#1B8F3A]">R$ 50.000,00</p>
                <p className="text-xs text-[#666666]">em comissões para nossos parceiros!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="pt-12 md:pt-16">
        <div className="bg-white px-6">
          <div className="max-w-6xl mx-auto text-center pb-8 md:pb-10">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#111111]">
              Comece a ganhar em <span className="text-[#1B8F3A]">3 passos</span> simples
            </h2>
            <p className="mt-3 text-lg text-[#666666]">É rápido, fácil e 100% online</p>
          </div>
        </div>

        <svg
          viewBox="0 0 1440 170"
          preserveAspectRatio="none"
          className="block w-full h-[92px] md:h-[120px]"
          aria-hidden="true"
        >
          <path
            d="M0,96 C180,48 370,28 560,54 C720,76 860,132 1040,132 C1188,132 1310,110 1440,76 L1440,170 L0,170 Z"
            fill="#19803A"
          />
        </svg>

        <div className="relative bg-[#19803A] px-6 pb-20 md:pb-24 pt-2 md:pt-4 overflow-hidden">
          <div className="max-w-6xl mx-auto relative">
            <div className="hidden lg:block absolute left-[16.66%] right-[16.66%] top-[112px] h-px bg-white/20" />
            <div className="hidden lg:block absolute left-1/3 top-[107px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white/80" />
            <div className="hidden lg:block absolute left-2/3 top-[107px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white/80" />

            <div className="grid gap-6 lg:grid-cols-3 relative">
              <ProcessStepCard
                n={1}
                icon={UserPlus}
                title="Cadastre-se"
                desc="Crie sua conta gratuitamente em poucos segundos."
              />
              <ProcessStepCard
                n={2}
                icon={Send}
                title="Envie a indicação"
                desc="Informe os dados da pessoa ou empresa interessada."
              />
              <ProcessStepCard
                n={3}
                icon={Wallet}
                title="Receba comissão"
                desc="Nós analisamos, fechamos o negócio e você recebe sua comissão."
                highlight
                badge="Você ganha aqui!"
              />
            </div>
          </div>

          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="absolute bottom-[-1px] left-0 block w-full h-[42px] md:h-[56px] pointer-events-none"
            aria-hidden="true"
          >
            <path
              d="M0,82 C190,52 378,44 570,58 C748,70 900,94 1068,96 C1222,98 1336,80 1440,62 L1440,120 L0,120 Z"
              fill="#065022"
            />
          </svg>
        </div>
      </section>

      {/* Prova */}
      <section id="prova" className="relative bg-[#065022] pt-0 pb-16 md:pb-20 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center text-white pt-2 md:pt-4">
            <h2 className="text-3xl md:text-5xl font-semibold leading-tight">
              Pessoas <span className="text-[#A3E635]">comuns</span> já estão
              <br />
              ganhando com indicações
            </h2>
            <p className="mt-3 text-base md:text-xl text-white/85">Resultados reais de quem já começou</p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <ResultCard
              icon={DollarSign}
              value="+R$ 750"
              title="por indicação"
              description="Comissão média por negócio fechado"
            />
            <ResultCard
              icon={TrendingUp}
              value="+R$ 12.450"
              title="recebidos"
              description="Ganhos acumulados de um parceiro"
            />
            <ResultCard
              icon={UserPlus}
              value="+2.000"
              title="indicações enviadas"
              description="Rede ativa crescendo todos os dias"
            />
            <ResultCard
              icon={ShieldCheck}
              title={
                <>
                  <span className="text-[#10A34A]">Pagamentos </span>
                  <span className="text-[#111111]">garantidos</span>
                </>
              }
              description="Total transparência em cada comissão"
            />
          </div>
        </div>
      </section>

      {/* Objeções */}
      <section id="objeções" className="py-20 px-4 md:px-6 bg-[#1B8F3A]/8">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-12 items-center justify-items-center">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-[#A5D6A7] bg-[#E8F5E9] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#2E7D32]">
              Por que funciona
            </span>
            <h2 className="mt-5 text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight text-[#111111]">
              Por que <span className="text-[#1B8F3A]">pagamos</span>
              <br />
              por indicações?
            </h2>
            <p className="mt-5 text-lg md:text-2xl leading-snug text-[#222222] max-w-xl mx-auto">
              Indicações são o canal mais eficiente de aquisição. Você conecta pessoas interessadas, nós fechamos o negócio e compartilhamos o lucro com quem gerou a oportunidade.
            </p>
          </div>

          <div className="flex justify-center">
            <img
              src={FECHADO_URL}
              alt="Negócio fechado"
              className="w-full max-w-[520px] h-auto object-contain"
            />
          </div>
        </div>
      </section>

      <section id="duvidas" className="py-20 px-4 md:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-[#A5D6A7] bg-[#E8F5E9] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#2E7D32]">
              Sem complicação, sem barreiras
            </span>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-[#111111]">
              Tire suas <span className="text-[#1B8F3A]">dúvidas</span>
            </h2>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <FaqCard icon={User} question="Preciso vender?" answer="Não." note="Você só indica." />
            <FaqCard icon={DollarSign} question="Preciso investir?" answer="Não." note="É totalmente gratuito." />
            <FaqCard icon={GraduationCap} question="Preciso ter experiência?" answer="Não." note="Qualquer pessoa pode começar." />
            <FaqCard icon={Handshake} question="E se não fechar?" answer="Você não" note="perde nada." />
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section id="cta-final" className="py-24 max-[400px]:py-16 px-3 md:px-4">
        <div className="max-w-[1400px] mx-auto rounded-3xl bg-[#065022] p-8 md:p-10 max-[400px]:p-5 shadow-[0_18px_40px_-24px_rgba(6,80,34,0.8)] relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-45"
            style={{ backgroundImage: "radial-gradient(circle at 72% 55%, rgba(34,197,94,0.45), rgba(34,197,94,0.18) 28%, transparent 56%)" }}
          />
          <div
            className="absolute inset-0 opacity-55"
            style={{ backgroundImage: "radial-gradient(circle at 18% 18%, rgba(132,204,22,0.22), transparent 34%), radial-gradient(circle at 84% 20%, rgba(255,255,255,0.15), transparent 28%)" }}
          />
          <div className="absolute -top-24 right-[28%] h-72 w-72 rounded-full bg-[#84CC16]/15 blur-3xl" />
          <div className="absolute -bottom-20 left-[48%] h-64 w-64 rounded-full bg-[#16A34A]/20 blur-3xl" />
          <div className="absolute top-20 right-[10%] h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute top-14 left-[42%] h-24 w-24 rounded-full border border-[#84CC16]/20" />
          <div className="absolute bottom-12 right-[30%] h-16 w-16 rounded-full border border-white/20" />
          <div className="relative flex items-center justify-center">
            <div className="text-white text-center">
              <span className="inline-flex rounded-full border border-[#84CC16] bg-transparent px-4 py-1.5 max-[600px]:px-3 max-[600px]:py-1 text-xs max-[600px]:text-[11px] max-[400px]:text-[10px] font-bold uppercase tracking-wide text-[#84CC16]">
                Chegou sua vez
              </span>
              <h2 className="mt-5 max-[400px]:mt-4 text-4xl md:text-5xl max-[600px]:text-[34px] max-[400px]:text-3xl max-[360px]:text-[26px] font-bold leading-[1.05] tracking-tight">
                Comece agora e faça
                <br />
                sua <span className="text-[#84CC16]">primeira indicação</span>
              </h2>
              <p className="mt-5 max-[400px]:mt-4 inline-flex items-center justify-center gap-2 text-lg max-[600px]:text-base max-[400px]:text-sm max-[360px]:text-xs text-white/90">
                <Clock3 className="h-5 w-5 text-white" />
                Leva menos de 1 minuto para começar
              </p>

              <div className="mt-7 max-[400px]:mt-5 flex flex-col items-center gap-4 max-[400px]:gap-3">
                <Link to="/cadastro" className="inline-block">
                  <Button
                    size="lg"
                    className="rounded-full h-14 max-[600px]:h-12 max-[400px]:h-11 max-[360px]:h-10 px-8 max-[600px]:px-6 max-[400px]:px-5 max-[360px]:px-4 text-2xl max-[600px]:text-xl max-[400px]:text-base max-[360px]:text-sm font-semibold bg-[#84CC16] hover:bg-[#73B312] text-white shadow-[0_10px_20px_-10px_rgba(132,204,22,0.9)]"
                  >
                    Comece a ganhar agora
                    <ArrowRight className="ml-3 max-[400px]:ml-2 h-5 w-5 max-[400px]:h-4 max-[400px]:w-4" />
                  </Button>
                </Link>
                <a href="#como-funciona" className="inline-flex items-center gap-2 text-lg max-[600px]:text-base max-[400px]:text-sm max-[360px]:text-xs font-medium text-white/90 hover:text-white">
                  Ver como funciona
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function ProcessStepCard({
  n,
  icon: Icon,
  title,
  desc,
  highlight,
  badge,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div className="relative w-full max-w-[320px] mx-auto aspect-square rounded-[18px] bg-white p-6 md:p-7 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.45)] flex flex-col items-center justify-center text-center">
      {badge && (
        <span className="absolute -top-3 right-3 md:right-4 inline-flex items-center rounded-full bg-[#1B8F3A] px-3 py-1 text-[11px] font-semibold text-white rotate-[-2deg]">
          {badge}
        </span>
      )}
      <div className="h-14 w-14 rounded-full bg-[#E8F5E9] grid place-items-center">
        <Icon className="h-7 w-7 text-[#1B8F3A]" />
      </div>
      <div className="mt-3 h-7 w-7 rounded-full bg-[#1B8F3A] text-white text-sm font-bold grid place-items-center">
        {n}
      </div>
      <h3 className={`mt-3 text-2xl md:text-[30px] font-semibold ${highlight ? "text-[#1B8F3A]" : "text-[#1F2937]"}`}>{title}</h3>
      <p className="mt-2 text-sm md:text-base text-[#666666] leading-snug">{desc}</p>
    </div>
  );
}

function BenefitItem({
  icon: Icon,
  text,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  className?: string;
}) {
  const words = text.split(" ");
  const pivot = Math.ceil(words.length / 2);
  const firstLine = words.slice(0, pivot).join(" ");
  const secondLine = words.slice(pivot).join(" ");

  return (
    <div className={`flex items-center gap-3 max-lg:justify-center max-lg:w-full ${className ?? ""}`}>
      <div className="h-11 w-11 rounded-full bg-[#F1F3F4] grid place-items-center shrink-0">
        <Icon className="h-6 w-6 text-[#1B8F3A]" />
      </div>
      <p className="text-sm text-[#333333] font-medium leading-tight max-lg:text-center">
        <span className="block">{firstLine}</span>
        <span className="block">{secondLine}</span>
      </p>
    </div>
  );
}

function ResultCard({
  icon: Icon,
  value,
  title,
  description,
  emphasizeTitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value?: string;
  title: React.ReactNode;
  description: string;
  emphasizeTitle?: boolean;
}) {
  return (
    <div className="rounded-[18px] bg-white p-6 text-center shadow-[0_12px_24px_-18px_rgba(0,0,0,0.35)]">
      <div className="mx-auto h-14 w-14 rounded-full bg-[#BFD1C7] grid place-items-center mb-4">
        <Icon className="h-7 w-7 text-[#0E7A33]" />
      </div>
      {value && <p className="text-2xl md:text-[30px] leading-none font-semibold text-[#10A34A]">{value}</p>}
      <p className={`mt-1 text-2xl md:text-[32px] leading-none font-semibold ${emphasizeTitle ? "text-[#10A34A]" : "text-[#111111]"}`}>
        {title}
      </p>
      <p className="mt-3 text-sm text-[#666666] leading-snug">{description}</p>
    </div>
  );
}

function ObjCard({ q, a, positive }: { q: string; a: string; positive: boolean }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6 shadow-card text-center">
      <p className="text-base text-muted-foreground">{q}</p>
      <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-lg ${
        positive ? "bg-primary-light text-primary-dark" : "bg-muted text-foreground"
      }`}>
        {positive ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
        {a}
      </div>
    </div>
  );
}

function FaqCard({
  icon: Icon,
  question,
  answer,
  note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  question: string;
  answer: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="mx-auto h-16 w-16 rounded-full bg-[#E8F5E9] grid place-items-center">
        <Icon className="h-8 w-8 text-[#1B8F3A]" />
      </div>
      <p className="mt-5 text-2xl md:text-[32px] leading-tight font-semibold text-[#111111] text-center">{question}</p>
      <div className="my-5 h-px bg-black/10" />
      <div className="flex items-start gap-2.5">
        <CheckCircle2 className="h-5 w-5 mt-0.5 text-[#1B8F3A] shrink-0" />
        <p className="text-lg leading-snug text-[#111111]">
          <span className="font-semibold text-[#1B8F3A]">{answer}</span>
          <br />
          <span>{note}</span>
        </p>
      </div>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="bg-green-50 px-6 py-16 text-gray-900 max-[400px]:text-xs">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 min-[1061px]:grid-cols-4 gap-10 max-[600px]:grid-cols-2">
          <div className="max-[1060px]:text-center max-[1060px]:mx-auto max-[600px]:col-span-2 max-[600px]:order-1">
            <div className="inline-flex items-center gap-2 max-[1060px]:justify-center">
              <img
                src={ativoLogoImage}
                alt="ATOM TECH"
                className="h-11 w-auto object-contain"
              />
            </div>
            <p className="mt-4 text-sm max-[400px]:text-xs text-gray-500 leading-relaxed max-w-xs max-[1060px]:mx-auto">
              Plataforma desenvolvida para que usuários indiquem pessoas e ganhem comissões de forma simples, prática e transparente.
            </p>
            <div className="mt-5 flex items-center gap-3 text-gray-500 max-[1060px]:justify-center">
              <a href="#" className="transition-colors hover:text-green-600" aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="transition-colors hover:text-green-600" aria-label="LinkedIn">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="#" className="transition-colors hover:text-green-600" aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="transition-colors hover:text-green-600" aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          <FooterLinkGroup
            title="Empresa"
            links={[
              { label: "Como funciona", href: "#como-funciona" },
              { label: "Resultados", href: "#prova" },
              { label: "Por que funciona", href: "#objeções" },
              { label: "Dúvidas", href: "#duvidas" },
              { label: "Começar", href: "#cta-final" },
            ]}
            className="max-[600px]:order-2"
          />

          <FooterLinkGroup
            title="Produto"
            links={[
              { label: "Funcionalidades", href: "#" },
              { label: "Carreiras", href: "#" },
              { label: "Como funciona", href: "#" },
              { label: "Contato", href: "#" },
            ]}
            className="max-[600px]:order-3"
          />

          <div className="max-[1060px]:text-center max-[1060px]:mx-auto max-[600px]:col-span-2 max-[600px]:order-4">
            <h3 className="text-base max-[400px]:text-sm font-semibold">Newsletter</h3>
            <p className="mt-4 text-sm max-[400px]:text-xs text-gray-500 leading-relaxed">
              Receba dicas, atualizações da plataforma e estratégias para aumentar suas indicações e ganhos.
            </p>
            <form className="mt-5 flex items-center gap-2 max-[1060px]:justify-center">
              <input
                type="email"
                placeholder="Seu e-mail"
                className="h-11 flex-1 rounded-full border border-green-200 bg-white px-4 text-sm max-[400px]:text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-full bg-green-500 px-5 py-2 text-sm max-[400px]:text-xs font-medium text-white transition hover:bg-green-600"
              >
                Inscrever
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 border-t border-green-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm max-[400px]:text-xs text-gray-500 max-[1060px]:text-center">
          <p>© 2025 ATOM TECH. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6 max-[400px]:gap-3">
            <a href="#" className="transition-colors hover:text-green-600">Política de Privacidade</a>
            <a href="#" className="transition-colors hover:text-green-600">Termos de Serviço</a>
            <a href="#" className="transition-colors hover:text-green-600">Segurança</a>
            <a href="#" className="transition-colors hover:text-green-600">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLinkGroup({
  title,
  links,
  className,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
  className?: string;
}) {
  return (
    <div className={`max-[1060px]:text-center max-[1060px]:mx-auto ${className ?? ""}`}>
      <h3 className="text-base max-[400px]:text-sm font-semibold">{title}</h3>
      <ul className="mt-4 space-y-3">
        {links.map((item) => (
          <li key={item.label}>
            <a href={item.href} className="text-sm max-[400px]:text-xs text-gray-500 transition-colors hover:text-green-600">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
