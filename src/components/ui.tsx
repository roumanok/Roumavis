"use client";
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <img
      className={small ? "logo small" : "logo"}
      src="/logo_roumavis.png"
      alt="Roumavis: nosotros dos"
      width={500}
      height={500}
    />
  );
}
export function Button({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button ${className}`} {...props}>
      {children}
    </button>
  );
}
export function NextButton({
  onClick,
  label = "Continuar",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button className="next" aria-label={label} onClick={onClick}>
      →
    </Button>
  );
}
export function Scene({
  children,
  id,
  className = "fade",
}: {
  children: ReactNode;
  id: string | number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);
  return (
    <section key={id} ref={ref} tabIndex={-1} className={`scene ${className}`}>
      {children}
    </section>
  );
}
export function Ornament() {
  return (
    <div className="ornament" aria-hidden="true">
      <span />✧<span />
    </div>
  );
}
export function ErrorMessage({ children }: { children: ReactNode }) {
  return children ? (
    <p className="error" role="alert">
      {children}
    </p>
  ) : null;
}
export function PhotoFrame({
  src,
  alt,
  caption,
  fill,
}: {
  src?: string;
  alt: string;
  caption?: string;
  /** Fill the frame (crop) instead of showing the whole photo. */
  fill?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="photo-frame">
      <div className={fill ? "photo-inner fill" : "photo-inner"}>
        {src && !failed ? (
          <img key={src} src={src} alt={alt} onError={() => setFailed(true)} />
        ) : (
          <span className="empty-photo" aria-label={alt}>
            ♡
          </span>
        )}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
export function Locked() {
  return (
    <main className="experience">
      <Scene id="locked">
        <Logo />
        <Ornament />
        <p className="emotional">Esta sorpresa es para nosotros.</p>
        <p>Abrí el enlace de tu tarjeta para comenzar.</p>
      </Scene>
    </main>
  );
}

/** Neutral loading state: a small beating heart (no logo, no spoilers). */
export function LoadingHeart({ label = "Un momento…" }: { label?: string }) {
  return (
    <div className="loading-heart" role="status">
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <path
          d="M150 262 C 80 212 30 170 30 110 C 30 72 58 46 92 46 C 118 46 138 60 150 82 C 162 60 182 46 208 46 C 242 46 270 72 270 110 C 270 170 220 212 150 262 Z"
          fill="#581C2B"
        />
      </svg>
      <p className="eyebrow">{label}</p>
    </div>
  );
}
