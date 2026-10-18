/* Keep all response controls available while optional presentation motion loads. */
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  const motion = gsap.matchMedia();
  motion.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('.summary-card', { y: 12, opacity: 0, stagger: 0.055, duration: 0.5, ease: 'power2.out' });
    gsap.utils.toArray('.simulator, .contacts-panel').forEach(section => {
      gsap.fromTo(section, { y: 15, opacity: 0.65 }, {
        y: 0, opacity: 1, duration: 0.55, ease: 'power2.out',
        scrollTrigger: { trigger: section, start: 'top 96%', once: true }
      });
    });
  });
}
