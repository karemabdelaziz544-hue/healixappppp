export const AppMotion = {
  duration: {
    fast: 150,
    base: 200,
    slow: 300,
  },
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
  },
  bouncySpring: {
    damping: 12,
    stiffness: 180,
    mass: 1,
  },
  scale: {
    pressCard: 0.98,
    pressButton: 0.95,
  },
  fade: {
    opacityLow: 0.7,
    opacityBase: 1,
  }
};
