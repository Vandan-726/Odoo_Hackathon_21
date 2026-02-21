'use client';
import { useEffect, useRef } from 'react';

const SHAPE_COUNT = 10;

function lerp(a, b, t) { return a + (b - a) * t; }

export default function AnimatedBackground() {
    const containerRef = useRef(null);
    const shapesRef = useRef([]);
    const rafRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const shapes = [];
        const vh = window.innerHeight;

        for (let i = 0; i < SHAPE_COUNT; i++) {
            const el = document.createElement('div');
            // 5x bigger: 200-700px instead of 40-140px
            const size = 400 + Math.random() * 1000;
            const x = -10 + Math.random() * 100;
            const y = Math.random() * Math.max(vh * 2, document.documentElement.scrollHeight || 2000);
            const isInitCircle = Math.random() > 0.5;
            // Light whitish shades
            const hue = 280 + Math.random() * 60;
            const sat = 24 + Math.random() * 16;
            const light = 85 + Math.random() * 12;
            const opacity = 0.15 + Math.random() * 0.12;
            const borderRadius = isInitCircle ? 50 : Math.random() * 8;

            el.style.cssText = `
                position: absolute;
                pointer-events: none;
                width: ${size}px;
                height: ${size}px;
                left: ${x}%;
                top: ${y}px;
                background: hsla(${hue}, ${sat}%, ${light}%, ${opacity});
                border: 1.5px solid hsla(${hue}, ${sat}%, ${light - 5}%, ${opacity * 0.6});
                border-radius: ${borderRadius}%;
                transition: none;
                will-change: transform, border-radius;
                z-index: 1;
            `;

            container.appendChild(el);
            shapes.push({
                el,
                baseX: x,
                baseY: y,
                size,
                // Much slower drift speeds (roughly 3-5x slower)
                driftAmplitudeX: 8 + Math.random() * 15,
                driftAmplitudeY: 6 + Math.random() * 12,
                driftSpeedX: 0.00015 + Math.random() * 0.0003,
                driftSpeedY: 0.0002 + Math.random() * 0.00025,
                driftPhaseX: Math.random() * Math.PI * 2,
                driftPhaseY: Math.random() * Math.PI * 2,
                // Slower morphing
                morphRate: 0.0002 + Math.random() * 0.0004,
                morphPhase: Math.random() * Math.PI * 2,
                currentBorderRadius: borderRadius,
                // Very slow rotation
                rotationSpeed: (Math.random() - 0.5) * 0.015,
                currentRotation: Math.random() * 360,
                hue, sat, light, opacity,
                // Slower pulse
                pulseRate: 0.00025 + Math.random() * 0.00025,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }

        shapesRef.current = shapes;

        function animate(time) {
            for (const s of shapes) {
                // Slow gentle drift only — no mouse parallax
                const dx = Math.sin(time * s.driftSpeedX + s.driftPhaseX) * s.driftAmplitudeX;
                const dy = Math.cos(time * s.driftSpeedY + s.driftPhaseY) * s.driftAmplitudeY;

                // Very slow morphing between shapes
                const morphCycle = Math.sin(time * s.morphRate + s.morphPhase);
                const targetBR = (morphCycle + 1) * 0.5 * 50;
                s.currentBorderRadius = lerp(s.currentBorderRadius, targetBR, 0.01);

                // Very slow rotation
                s.currentRotation += s.rotationSpeed;

                // Subtle pulse
                const pulse = Math.sin(time * s.pulseRate + s.pulsePhase);
                const curOpacity = s.opacity + pulse * 0.02;

                s.el.style.background = `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${curOpacity})`;
                s.el.style.borderColor = `hsla(${s.hue}, ${s.sat}%, ${s.light - 5}%, ${curOpacity * 0.6})`;
                s.el.style.borderRadius = `${s.currentBorderRadius}%`;
                s.el.style.transform = `translate(${dx}px, ${dy}px) rotate(${s.currentRotation}deg)`;
            }

            rafRef.current = requestAnimationFrame(animate);
        }

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(rafRef.current);
            shapes.forEach(s => s.el.remove());
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed',
                inset: 0,
                overflow: 'visible',
                pointerEvents: 'none',
                zIndex: 1,
            }}
        />
    );
}
