import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import gif from "../../../assets/img/timer.gif";
import { useLocation } from "react-router-dom";

gsap.registerPlugin(ScrollTrigger);

const CLOUD_NAME = "de30xvjku";

const Hero = () => {
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const loaderRef = useRef(null);
  const location = useLocation();
  const resizeObserverRef = useRef(null);
  const imagesRef = useRef([]);
  const sortedResourcesRef = useRef([]);

  useEffect(() => {
    const fetchAndLoad = async () => {
      const res = await fetch(
        `https://res.cloudinary.com/${CLOUD_NAME}/image/list/frames.json`
      );
      const data = await res.json();

      const sorted = data.resources.sort((a, b) =>
        a.public_id.localeCompare(b.public_id)
      );

      sortedResourcesRef.current = sorted;
      const allImages = new Array(sorted.length).fill(null);
      imagesRef.current = allImages;

      const loadImage = (i) =>
        new Promise((resolve) => {
          const resource = sorted[i];
          const img = new Image();
          img.src = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto:good/v${resource.version}/${resource.public_id}.${resource.format}`;
          img.onload = () => { allImages[i] = img; resolve(); };
          img.onerror = () => resolve();
        });

      const loadBatch = async (start, end) => {
        const promises = [];
        for (let i = start; i < end && i < sorted.length; i++) {
          promises.push(loadImage(i));
        }
        await Promise.all(promises);
      };

      await loadBatch(0, 30);
      setIsLoaded(true);
      drawFrame(0);

      await loadBatch(30, 150);
      await loadBatch(150, sorted.length);
    };

    fetchAndLoad();
  }, []);

  const drawFrame = (index) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const allImages = imagesRef.current;

    let actualIndex = index;
    if (!allImages[index]) {
      for (let offset = 1; offset < 60; offset++) {
        if (allImages[index - offset]) { actualIndex = index - offset; break; }
        if (allImages[index + offset]) { actualIndex = index + offset; break; }
      }
    }

    if (!allImages[actualIndex]) return;

    const { clientWidth, clientHeight } = canvas;
    canvas.width = clientWidth * window.devicePixelRatio;
    canvas.height = clientHeight * window.devicePixelRatio;
    context.scale(window.devicePixelRatio, window.devicePixelRatio);

    const img = allImages[actualIndex];
    const scale = Math.max(clientWidth / img.width, clientHeight / img.height);
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const x = (clientWidth - scaledWidth) / 2;
    const y = (clientHeight - scaledHeight) / 2;
    context.clearRect(0, 0, clientWidth, clientHeight);
    context.drawImage(img, x, y, scaledWidth, scaledHeight);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isLoaded) return;
    const handleResize = () => drawFrame(0);
    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(canvas);
    window.addEventListener("resize", handleResize);
    return () => {
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [isLoaded]);

  useEffect(() => {
    document.body.style.overflow = isLoaded ? "auto" : "hidden";
    document.documentElement.style.overflowX = "hidden";
    return () => {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflowX = "";
    };
  }, [isLoaded]);

  useLayoutEffect(() => {
    if (!isLoaded) return;

    ScrollTrigger.getAll().forEach(st => st.kill(true));
    document.querySelectorAll(".pin-spacer").forEach(el => el.remove());

    const totalFrames = sortedResourcesRef.current.length;
    let tl;
    const ctx = gsap.context(() => {
      tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "+=400%",
          scrub: 1.5,
          pin: true,
          onUpdate: self => {
            const frameIndex = Math.round(self.progress * (totalFrames - 1));
            drawFrame(frameIndex);
          },
        },
      });

      drawFrame(0);

      if (loaderRef.current) {
        gsap.to(loaderRef.current, {
          opacity: 0,
          duration: 1,
          ease: "power2.out",
          onComplete: () => {
            if (loaderRef.current) loaderRef.current.style.display = "none";
          },
        });
      }
    });

    const clear = () => {
      if (tl?.scrollTrigger) tl.scrollTrigger.kill(true);
      ScrollTrigger.getAll().forEach(t => t.kill(true));
      document.querySelectorAll(".pin-spacer").forEach(el => el.remove());
      ctx.revert();
      gsap.killTweensOf("*");
    };

    window.addEventListener("beforeunload", clear);
    return () => {
      clear();
      window.removeEventListener("beforeunload", clear);
    };
  }, [isLoaded, location.pathname]);

  return (
    <section
      id="hero"
      className="hero-section h-screen w-full relative overflow-hidden bg-black"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ width: "100%", height: "100%" }}
      />
      <div
        ref={loaderRef}
        className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999]"
      >
        <img
          src={gif}
          alt="loading..."
          className="w-[140px] sm:w-[180px] md:w-[220px] lg:w-[260px] object-contain"
        />
      </div>
    </section>
  );
};

export default Hero;
