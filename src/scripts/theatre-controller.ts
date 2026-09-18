/**
 * theatre-controller.ts — Powers the Cinematic Demo Theatre
 *
 * Handles video playback, 3D device frame tilt, responsive viewports,
 * category filtering, and audio integration.
 */

interface DemoEntry {
  slug: string;
  businessName: string;
  industrySlug: string;
  tagline: string;
  city: string;
  industryName: string;
  category: string;
}

// Brand accent colors per industry for ambient lighting
const INDUSTRY_GLOWS: Record<string, string> = {
  "real-estate": "rgba(193, 82, 46, 0.35)",
  "hotels-resorts": "rgba(15, 75, 60, 0.4)",
  "healthcare-clinics": "rgba(34, 103, 122, 0.4)",
  "education-coaching": "rgba(190, 90, 40, 0.35)",
  "dental-clinics": "rgba(20, 120, 140, 0.35)",
  "restaurants-cafes": "rgba(150, 40, 40, 0.4)",
  "jewellery": "rgba(200, 145, 44, 0.4)",
  "interior-design": "rgba(100, 110, 95, 0.35)",
  "salon-spa": "rgba(180, 140, 190, 0.35)",
  "professional-services": "rgba(20, 80, 80, 0.4)",
  "fitness-studios": "rgba(230, 70, 40, 0.35)",
  "events-photography": "rgba(160, 90, 70, 0.35)",
  "retail-d2c": "rgba(210, 110, 50, 0.35)",
  "automotive": "rgba(120, 130, 140, 0.35)",
  "diagnostics-labs": "rgba(15, 60, 120, 0.4)",
};

function initTheatreController() {
  const theatre = document.getElementById("cinematic-theatre");
  const dataScript = document.getElementById("theatre-data");
  if (!theatre || !dataScript) return;

  let demos: DemoEntry[] = [];
  try {
    demos = JSON.parse(dataScript.textContent || "[]");
  } catch (_) {
    return;
  }
  if (demos.length === 0) return;

  let currentIndex = 0;
  let currentMode: "mobile" | "desktop" = "mobile";
  let activeFilter = "all";

  // Elements
  const iframeMobile = document.getElementById("theatre-iframe-mobile") as HTMLIFrameElement | null;
  const posterMobile = document.getElementById("theatre-poster-mobile") as HTMLImageElement | null;
  const iframeDesktop = document.getElementById("theatre-iframe-desktop") as HTMLIFrameElement | null;
  const posterDesktop = document.getElementById("theatre-poster-desktop") as HTMLImageElement | null;
  const desktopScreen = document.getElementById("theatre-desktop-screen");
  const phoneFrame = document.getElementById("theatre-phone-frame");
  const glow = document.getElementById("theatre-glow");
  const soundBtn = document.getElementById("theatre-sound-btn");
  const soundLabel = document.getElementById("theatre-sound-label");

  // Dynamic scaling for desktop studio iframe (render true 1280px desktop resolution)
  const updateDesktopIframeScale = () => {
    if (!desktopScreen || !iframeDesktop) return;
    const rect = desktopScreen.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const scale = rect.width / 1280;
      const iframeHeight = rect.height / scale;
      iframeDesktop.style.transform = `scale(${scale})`;
      iframeDesktop.style.height = `${iframeHeight}px`;
    }
  };

  if (desktopScreen && typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => {
      if (currentMode === "desktop") {
        updateDesktopIframeScale();
      }
    }).observe(desktopScreen);
  }
  window.addEventListener("resize", () => {
    if (currentMode === "desktop") {
      updateDesktopIframeScale();
    }
  });

  // Inspector Elements
  const cardTitle = document.getElementById("theatre-card-title");
  const cardTagline = document.getElementById("theatre-card-tagline");
  const cardCategory = document.getElementById("theatre-card-category");
  const cardCity = document.getElementById("theatre-card-city");
  const launchBtn = document.getElementById("theatre-launch-btn") as HTMLAnchorElement | null;
  const desktopUrl = document.getElementById("theatre-desktop-url");
  const counter = document.getElementById("theatre-counter");
  const prevBtn = document.getElementById("theatre-prev-btn");
  const nextBtn = document.getElementById("theatre-next-btn");
  const thumbTrack = document.getElementById("theatre-thumbnails");

  const syncSoundUI = (enabled: boolean) => {
    if (!soundBtn || !soundLabel) return;
    if (enabled) {
      soundBtn.classList.add("is-active");
      soundLabel.textContent = "Sound: ON";
    } else {
      soundBtn.classList.remove("is-active");
      soundLabel.textContent = "Sound FX";
    }
  };

  // Check initial audio state
  if (window.atittleAudio) {
    syncSoundUI(window.atittleAudio.isSoundEnabled());
  }
  window.addEventListener("atittle:sound-toggled", (e: Event) => {
    const custom = e as CustomEvent<{ enabled: boolean }>;
    syncSoundUI(custom.detail?.enabled ?? false);
  });

  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      if (window.atittleAudio) {
        const newState = window.atittleAudio.toggle();
        syncSoundUI(newState);
      }
    });
  }

  // Load and play demo at index
  const selectDemo = (index: number, playSound = true) => {
    if (index < 0) index = demos.length - 1;
    if (index >= demos.length) index = 0;
    currentIndex = index;

    const demo = demos[currentIndex];
    if (!demo) return;

    if (playSound && window.atittleAudio) {
      window.atittleAudio.playSwoosh();
    }

    // Update inspector texts
    if (cardTitle) cardTitle.textContent = demo.businessName;
    if (cardTagline) cardTagline.textContent = demo.tagline;
    if (cardCategory) cardCategory.textContent = demo.category;
    if (cardCity) cardCity.textContent = demo.city;
    if (launchBtn) {
      launchBtn.href = `/demos/${demo.slug}`;
      launchBtn.setAttribute("aria-label", `Launch live working prototype of ${demo.businessName}`);
    }
    if (desktopUrl) desktopUrl.textContent = `atittle.com/demos/${demo.slug}`;
    if (counter) counter.textContent = `${currentIndex + 1} / ${demos.length}`;

    // Update ambient glow color
    if (glow) {
      const color = INDUSTRY_GLOWS[demo.industrySlug] || "rgba(193, 82, 46, 0.35)";
      glow.style.background = `radial-gradient(circle, ${color} 0%, rgba(0, 0, 0, 0) 70%)`;
    }

    // Update Phone Screen with real live mobile demo + instant mobile snapshot
    if (posterMobile) {
      posterMobile.src = `/images/showcase/${demo.slug}-mobile.webp`;
      posterMobile.style.opacity = "1";
    }
    if (iframeMobile) {
      const demoUrl = `/demos/${demo.slug}/?theatre=1`;
      iframeMobile.src = demoUrl;
      iframeMobile.onload = () => {
        if (posterMobile) {
          setTimeout(() => {
            posterMobile.style.opacity = "0";
          }, 200);
        }
      };
    }

    // Update Studio Desktop Screen with real live desktop demo + instant desktop snapshot
    if (posterDesktop) {
      posterDesktop.src = `/images/showcase/${demo.slug}-desktop.webp`;
      posterDesktop.style.opacity = "1";
    }
    if (iframeDesktop) {
      const demoUrl = `/demos/${demo.slug}/?theatre=1`;
      iframeDesktop.src = demoUrl;
      iframeDesktop.onload = () => {
        updateDesktopIframeScale();
        if (posterDesktop) {
          setTimeout(() => {
            posterDesktop.style.opacity = "0";
          }, 200);
        }
      };
    }

    // Update active thumbnail
    if (thumbTrack) {
      const thumbs = thumbTrack.querySelectorAll<HTMLElement>(".theatre-thumb-item");
      thumbs.forEach((t) => {
        const itemIdx = Number(t.dataset.index);
        const isActive = itemIdx === currentIndex;
        t.classList.toggle("is-active", isActive);
        t.setAttribute("aria-selected", isActive ? "true" : "false");
        if (isActive) {
          t.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      });
    }
  };

  // Open & Close methods
  const openTheatre = (slug?: string) => {
    theatre.classList.add("is-open");
    theatre.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    let targetIndex = 0;
    if (slug) {
      const found = demos.findIndex((d) => d.slug === slug);
      if (found !== -1) targetIndex = found;
    }
    selectDemo(targetIndex, false);
    if (currentMode === "desktop") {
      setTimeout(updateDesktopIframeScale, 100);
    }
  };

  const closeTheatre = () => {
    theatre.classList.remove("is-open");
    theatre.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    if (iframeDesktop) {
      iframeDesktop.src = "about:blank";
    }
    if (iframeMobile) {
      iframeMobile.src = "about:blank";
    }

    if (window.atittleAudio) {
      window.atittleAudio.playClick(450);
    }
  };

  // Event Listeners for Open / Close
  window.addEventListener("atittle:open-theatre", (e: Event) => {
    const custom = e as CustomEvent<{ slug?: string }>;
    openTheatre(custom.detail?.slug);
  });

  theatre.querySelectorAll("[data-theatre-close]").forEach((btn) => {
    btn.addEventListener("click", closeTheatre);
  });

  // Next / Prev Step Buttons
  if (prevBtn) {
    prevBtn.addEventListener("click", () => selectDemo(currentIndex - 1));
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => selectDemo(currentIndex + 1));
  }

  // Viewport Switcher (Mobile vs Desktop)
  theatre.querySelectorAll<HTMLButtonElement>("[data-viewport]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const vp = btn.dataset.viewport as "mobile" | "desktop";
      if (!vp || vp === currentMode) return;
      currentMode = vp;
      theatre.setAttribute("data-mode", vp);

      theatre.querySelectorAll("[data-viewport]").forEach((b) => {
        const isSelected = b === btn;
        b.classList.toggle("is-active", isSelected);
        b.setAttribute("aria-checked", isSelected ? "true" : "false");
      });

      if (vp === "desktop") {
        setTimeout(updateDesktopIframeScale, 50);
      }

      if (window.atittleAudio) {
        window.atittleAudio.playClick(800);
      }
    });
  });

  // Category Filter Pills
  theatre.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((pill) => {
    pill.addEventListener("click", () => {
      const filter = pill.dataset.filter || "all";
      activeFilter = filter;

      theatre.querySelectorAll("[data-filter]").forEach((p) => p.classList.toggle("is-active", p === pill));

      // Filter thumbnails
      if (thumbTrack) {
        const thumbs = thumbTrack.querySelectorAll<HTMLElement>(".theatre-thumb-item");
        let firstMatch = -1;
        thumbs.forEach((t) => {
          const cat = t.dataset.category || "";
          const matches = filter === "all" || cat === filter;
          t.style.display = matches ? "flex" : "none";
          if (matches && firstMatch === -1) {
            firstMatch = Number(t.dataset.index);
          }
        });

        if (firstMatch !== -1) {
          selectDemo(firstMatch);
        }
      }
    });
  });

  // Thumbnail clicks
  if (thumbTrack) {
    thumbTrack.addEventListener("click", (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>(".theatre-thumb-item");
      if (!target) return;
      const index = Number(target.dataset.index);
      if (!isNaN(index)) {
        selectDemo(index);
      }
    });
  }

  // Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    if (!theatre.classList.contains("is-open")) return;

    if (e.key === "Escape") {
      closeTheatre();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      selectDemo(currentIndex + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      selectDemo(currentIndex - 1);
    }
  });

  // 3D Phone Frame Tilt on Cursor Movement (Desktop Only)
  if (phoneFrame && !window.matchMedia("(hover: none)").matches) {
    phoneFrame.addEventListener("mousemove", (e) => {
      const rect = phoneFrame.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const normX = (x - rect.width / 2) / (rect.width / 2);
      const normY = (y - rect.height / 2) / (rect.height / 2);

      const rotX = (-normY * 12).toFixed(2);
      const rotY = (normX * 14).toFixed(2);

      phoneFrame.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    phoneFrame.addEventListener("mouseleave", () => {
      phoneFrame.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    });
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheatreController);
  } else {
    initTheatreController();
  }
}
