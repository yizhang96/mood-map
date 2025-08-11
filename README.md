# Mood Map 🧠💬

**Mood Map** is an interactive, web-based tool that lets users log and visualize their emotions in real time.  
Inspired by a physical mood map created by the [Flourish Science team](https://www.myflourish.ai/mood-map) and the [Circumplex Model of Affect](https://psu.pb.unizin.org/psych425/chapter/circumplex-models/), it maps feelings along two key psychological dimensions:  
- **Valence** (how pleasant or unpleasant an emotion feels)  
- **Arousal** (how energized or calm the emotion is)

Each user can place a dot on the 2D canvas to represent their current emotional state.  
In **Version 1**, users can freely type their own emotion labels.  
In **Version 2**, users choose from 20 predefined emotion labels, and can also create and share group mood boards with friends, classmates, or teams.


## Why Mood Map?

Emotions are complex but not random. Decades of affective science show that most emotions can be organized along the **valence–arousal plane** (Russell, 1980). The Mood Map builds on this science to:

- Help users check in with their feelings in a structured yet flexible way  
- Enable groups (e.g., classrooms, teams) to visualize the collective emotional landscape  
- Offer a low-barrier entry into emotional tracking


## Key Differences Between Versions

| Feature | **Version 1** | **Version 2** |
|---------|---------------|---------------|
| **Labeling** | Users create custom emotion labels | Users choose from 20 predefined emotion labels |
| **Group Boards** | No group sharing | Users can create and share mood boards for specific groups (friends, classes, teams) |
| **Interaction** | Individual mood logging | Group mood sharing and comparison |


## Features (Both Versions)

- 🟦 Real-time mood logging via an interactive canvas  
- ✍️ Emotion labeling (custom in V1, predefined in V2)  
- 🧠 Grounded in psychological research on emotion and affect  
- 🌍 Built to support emotional visibility for individuals or groups  


## Live Demos

- **👉 [Try Mood Map V1](https://yizhang96.github.io/mood-map/v1/)**  
- **👉 [Try Mood Map V2](https://yizhang96.github.io/mood-map/v2/)** *(with group boards & predefined labels)*


## Built With

- **React + TypeScript**: Frontend framework and type-safe logic  
- **Vite**: Lightning-fast dev environment with hot module replacement  
- **Tailwind CSS**: Utility-first styling  
- **Supabase**: Backend-as-a-service for storing mood data


## Developer Notes

This project uses a minimal setup for React + Vite with ESLint support.

### Plugins

- [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react) (Babel-based)  
- [`@vitejs/plugin-react-swc`](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react-swc) (SWC-based)  
