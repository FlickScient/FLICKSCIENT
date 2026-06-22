// components/FlickScientLogo.tsx

export default function FlickScientLogo({ size = 200 }: { size?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Ambient glow behind */}
      <div className="logo-bg-glow" />
      
      {/* Orbiting light dots */}
      <div className="logo-ring-1" />
      <div className="logo-ring-2" />

      {/* The actual logo */}
      <img
        src="https://lottie.host/960c1fe3-95d4-4e4e-9235-05fb5cd25650/f2fmRYe7Pd.jpg"
        alt="FlickScient AI"
        className="logo-img"
        style={{ width: size * 0.9, height: 'auto', position: 'relative', zIndex: 2 }}
      />

      {/* Core sphere pulse */}
      <div className="logo-core-glow" />
    </div>
  );
}
