# Mood Map 🧠💬

**Mood Map** is an interactive, web-based tool that lets users log and visualize their emotions in real time.

Inspired by a physical mood map created by the [Flourish Science team](https://www.myflourish.ai/mood-map) and the [circumplex model of affect](https://psu.pb.unizin.org/psych425/chapter/circumplex-models/), it maps feelings along two key psychological dimensions:  
- **Valence** (how pleasant or unpleasant an emotion feels)  
- **Arousal** (how energized or calm the emotion is)

Each user can place a dot anywhere on the 2D canvas to represent their current emotional state, optionally adding a label. Hovering/tapping reveals the label, and dots can be updated to reflect changing moods—encouraging emotional awareness and reflection.

## Why Mood Map?

Emotions are complex but not random. Decades of affective science show that most emotions can be organized along the **valence-arousal plane** (Russell, 1980). The Mood Map builds on this science to:

- Help users check in with their feelings in a structured yet flexible way  
- Enable groups (e.g., classrooms, teams) to visualize the collective emotional landscape  
- Offer a low-barrier entry into emotional tracking—no need to pick from predefined categories

## Features

- 🟦 Real-time mood logging via an interactive canvas  
- ✍️ Optional labeling of emotional states  
- 🧠 Grounded in psychological research on emotion and affect  
- 🌍 Built to support group-based emotional visibility (e.g., in classrooms or workshops)

## Live Demo

👉 [Try the Mood Map](https://yizhang96.github.io/mood-map/)

## Built With

- **React + TypeScript**: Frontend framework and type-safe logic  
- **Vite**: Lightning-fast dev environment with hot module replacement  
- **Tailwind CSS**: Utility-first styling  
- **Supabase**: Backend-as-a-service for storing mood data (optional)

---

## Developer Notes

This project uses a minimal setup for React + Vite with ESLint support.

### Plugins

- [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react) (Babel-based)
- [`@vitejs/plugin-react-swc`](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react-swc) (SWC-based)