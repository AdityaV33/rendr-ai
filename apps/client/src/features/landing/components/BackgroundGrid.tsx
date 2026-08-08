import React from "react";

export const BackgroundGrid: React.FC = () => {
  const starMap = `
    5vw 10vh 0 #fff, 15vw 25vh 0 #fff, 25vw 5vh 0 #fff, 35vw 35vh 0 #fff, 
    45vw 15vh 0 #fff, 55vw 45vh 0 #fff, 65vw 5vh 0 #fff, 75vw 25vh 0 #fff, 
    85vw 10vh 0 #fff, 95vw 40vh 0 #fff, 10vw 50vh 0 #fff, 20vw 70vh 0 #fff, 
    30vw 60vh 0 #fff, 40vw 80vh 0 #fff, 50vw 55vh 0 #fff, 60vw 90vh 0 #fff, 
    70vw 65vh 0 #fff, 80vw 85vh 0 #fff, 90vw 75vh 0 #fff, 12vw 90vh 0 #fff,
    28vw 85vh 0 #fff, 48vw 95vh 0 #fff, 68vw 85vh 0 #fff, 88vw 95vh 0 #fff,
    8vw 35vh 0 #fff, 22vw 15vh 0 #fff, 38vw 25vh 0 #fff, 58vw 15vh 0 #fff,
    78vw 45vh 0 #fff, 98vw 20vh 0 #fff, 18vw 55vh 0 #fff, 32vw 75vh 0 #fff,
    52vw 65vh 0 #fff, 72vw 55vh 0 #fff, 92vw 60vh 0 #fff, 42vw 40vh 0 #fff,
    2vw 75vh 0 #fff, 15vw 45vh 0 #fff, 85vw 55vh 0 #fff, 95vw 85vh 0 #fff,
    1vw 12vh 0 #fff, 4vw 29vh 0 #fff, 9vw 22vh 0 #fff, 14vw 14vh 0 #fff,
    19vw 33vh 0 #fff, 24vw 18vh 0 #fff, 29vw 29vh 0 #fff, 34vw 6vh 0 #fff,
    39vw 44vh 0 #fff, 44vw 27vh 0 #fff, 49vw 38vh 0 #fff, 54vw 8vh 0 #fff,
    59vw 51vh 0 #fff, 64vw 19vh 0 #fff, 69vw 32vh 0 #fff, 74vw 11vh 0 #fff,
    79vw 48vh 0 #fff, 84vw 26vh 0 #fff, 89vw 37vh 0 #fff, 94vw 16vh 0 #fff,
    99vw 28vh 0 #fff, 6vw 72vh 0 #fff, 11vw 58vh 0 #fff, 16vw 81vh 0 #fff,
    21vw 67vh 0 #fff, 26vw 76vh 0 #fff, 31vw 53vh 0 #fff, 36vw 88vh 0 #fff,
    41vw 62vh 0 #fff, 46vw 71vh 0 #fff, 51vw 84vh 0 #fff, 56vw 96vh 0 #fff,
    61vw 79vh 0 #fff, 66vw 56vh 0 #fff, 71vw 89vh 0 #fff, 76vw 69vh 0 #fff,
    81vw 98vh 0 #fff, 86vw 64vh 0 #fff, 91vw 87vh 0 #fff, 96vw 52vh 0 #fff,
    3vw 41vh 0 #fff, 27vw 47vh 0 #fff, 57vw 34vh 0 #fff, 87vw 42vh 0 #fff,
    33vw 94vh 0 #fff, 83vw 6vh 0 #fff, 63vw 97vh 0 #fff, 97vw 92vh 0 #fff
  `;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none flex justify-center overflow-hidden bg-[#0a0a0a]">
      {/* Stars Outer Glow Layer */}
      <div 
        className="absolute inset-0 opacity-60 blur-[6px]"
        style={{
          boxShadow: starMap,
          width: '2px',
          height: '2px',
          background: '#fff'
        }}
      />
      
      {/* Stars Inner Glow Layer */}
      <div 
        className="absolute inset-0 opacity-100 blur-[2px]"
        style={{
          boxShadow: starMap,
          width: '2px',
          height: '2px',
          background: '#fff'
        }}
      />
      
      {/* Pixel Stars Core Layer */}
      <div 
        className="absolute inset-0 opacity-100"
        style={{
          boxShadow: starMap,
          width: '2px',
          height: '2px',
          background: '#fff',
          imageRendering: 'pixelated'
        }}
      />
      
      {/* Pixel Art Retro Moon / Death Star */}
      <svg width="350" height="350" viewBox="0 0 16 16" className="absolute top-[-5%] right-[2%] opacity-60" shapeRendering="crispEdges">
        {/* Base Moon Shape */}
        <path d="M5 1h6v1h2v2h1v2h1v4h-1v2h-1v2h-2v1H5v-1H3v-2H2v-2H1V6h1V4h1V2h2V1z" fill="#dddddd" />
        
        {/* Large Crater / Death Star Eye */}
        <path d="M9 3h4v4H9V3z" fill="#0a0a0a" opacity="0.5" />
        <path d="M10 4h2v2h-2V4z" fill="#0a0a0a" opacity="0.8" />
        
        {/* Small Craters */}
        <rect x="4" y="9" width="2" height="2" fill="#0a0a0a" opacity="0.4" />
        <rect x="11" y="11" width="1" height="1" fill="#0a0a0a" opacity="0.4" />
        <rect x="5" y="5" width="1" height="1" fill="#0a0a0a" opacity="0.4" />
        <rect x="8" y="12" width="2" height="1" fill="#0a0a0a" opacity="0.4" />
        
        {/* Crescent/Shadow detailing on edges */}
        <path d="M4 14h8v1H4v-1zM2 10h1v4H2v-4zM13 12h1v2h-1v-2zM1 6h1v4H1V6zM3 3h1v2H3V3z" fill="#0a0a0a" opacity="0.4" />
      </svg>

      {/* Dark overlay to fade edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-app-bg)_80%)] z-10" />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 w-full h-full opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--color-app-text) 1px, transparent 1px),
            linear-gradient(to bottom, var(--color-app-text) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: 'center center'
        }}
      />
    </div>
  );
};
