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
}: {
  children: ReactNode;
  id: string | number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);
  return (
    <section key={id} ref={ref} tabIndex={-1} className="scene fade">
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
}: {
  src?: string;
  alt: string;
  caption?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="photo-frame">
      <div className="photo-inner">
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
