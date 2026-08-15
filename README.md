# VinWave DSP Studio

Before writing any code, carefully read ALL attached documents.

Attached Files (Priority Order)

1. PROJECT_CONTEXT.md

2. SCREEN_SPEC.md

3. DSP_SPEC.md

Treat these documents as the official product specification.

If there is any conflict, PROJECT_CONTEXT.md has the highest priority.

Do NOT ignore any requirement unless technically impossible.

------------------------------------------------------------

PROJECT

Build Version 1.0 of VinWave Studio.

VinWave Studio is a professional Digital Signal Processing Engineering Workspace designed for speech enhancement using classical DSP algorithms.

This is NOT a student-style project.

Build it like a commercial desktop engineering application.

The UI quality should feel inspired by:

• Adobe Audition

• MATLAB App Designer

• Visual Studio Code

• Figma

• Linear

The application should immediately feel premium, polished, modern and engineering focused.

------------------------------------------------------------

GENERAL REQUIREMENTS

Use a desktop-first responsive layout.

Use a modern dark theme.

No mobile UI.

No generic dashboard.

No Bootstrap-looking components.

No colorful templates.

No unnecessary gradients.

No cartoon design.

No gaming UI.

The application should feel like software engineers use every day.

------------------------------------------------------------

APPLICATION STRUCTURE

Generate a scalable project architecture.

Separate

• Components

• Pages

• Layouts

• Hooks

• DSP Modules

• Utilities

• Assets

• Styles

• Types

Use reusable components.

Avoid duplicate code.

Write production-quality code.

------------------------------------------------------------

LAYOUT

The application must remain inside one window.

Never open multiple windows.

Use the following layout.

LEFT SIDEBAR

TOP TOOLBAR

MAIN WORKSPACE

RIGHT PROPERTIES PANEL (collapsible)

BOTTOM STATUS BAR

The sidebar should always remain visible.

------------------------------------------------------------

SIDEBAR

Dashboard

Import Audio

Record Audio

Signal Explorer

Enhancement

Comparison

Export

Settings

Each item should include

Icon

Hover Animation

Active Indicator

Tooltip

------------------------------------------------------------

TOP TOOLBAR

Application Logo

Workspace Title

Current File

Search Placeholder

Notification Placeholder

Settings Shortcut

------------------------------------------------------------

BOTTOM STATUS BAR

Display

Current Project

Duration

Sample Rate

CPU Placeholder

Memory Placeholder

Application Status

------------------------------------------------------------

DASHBOARD

Create a premium landing page.

Include

Application Logo

Tagline

Three Action Cards

Import Audio

Record Audio

Explore Demo

Recent Projects

Recent Processing History

Quick Tips

Professional empty state.

------------------------------------------------------------

IMPORT AUDIO

Support

WAV

MP3

FLAC

Drag & Drop

Browse Button

Recent Files

Validate unsupported formats.

------------------------------------------------------------

RECORD AUDIO

Implement

Microphone Selection

Record

Pause

Resume

Stop

Recording Timer

Live Waveform

Animated Recording Indicator

------------------------------------------------------------

SIGNAL EXPLORER

This is the heart of the application.

Implement

Waveform

Timeline

Playback Cursor

Zoom

Pan

Playback Controls

Audio Metadata

Audio Statistics

FFT Visualization

Spectrogram Visualization

Allow users to click anywhere on the waveform.

When clicked

Move playback cursor.

Synchronize timeline.

Update selected position.

Highlight the corresponding position on the spectrogram.

Update metadata.

Enable zooming and panning.

This Interactive Audio Inspector should feel similar to professional engineering software.

------------------------------------------------------------

ENHANCEMENT

Display algorithm cards.

Implement

Spectral Subtraction

Wiener Filter

Voice Activity Detection

MMSE

MMSE should appear as

Coming Soon

Each algorithm card should include

Description

Parameters

Apply Button

Information Button

Estimated Processing Time

------------------------------------------------------------

DSP

Implement Version 1 algorithms

Spectral Subtraction

Wiener Filter

Voice Activity Detection

Do NOT use AI.

Do NOT use Machine Learning.

Implement classical DSP algorithms only.

The DSP pipeline should follow

Import

↓

Analysis

↓

Algorithm

↓

Processing

↓

Evaluation

↓

Comparison

↓

Export

------------------------------------------------------------

PROCESSING

Never freeze the UI.

Display a processing timeline.

Example

Loading Audio

Computing FFT

Detecting Noise

Running Algorithm

Calculating SNR

Generating Results

Preparing Export

Show progress.

Allow cancellation if possible.

------------------------------------------------------------

COMPARISON

Display

Original Audio

Enhanced Audio

Original Waveform

Enhanced Waveform

Original Spectrogram

Enhanced Spectrogram

Difference View

Statistics

Input SNR

Output SNR

SNR Improvement

Processing Time

Synchronize playback.

Moving the playback cursor should move on both waveforms simultaneously.

------------------------------------------------------------

EXPORT

Support

WAV

MP3

Allow user to choose destination.

Maintain export history.

------------------------------------------------------------

SETTINGS

Theme

Performance

Audio

Application Information

Version

Keyboard Shortcuts Placeholder

------------------------------------------------------------

ANIMATIONS

Everything should feel smooth.

Page Transition

Fade + Slide

200 ms

Sidebar

Smooth animation

Cards

Scale 1.03

Buttons

Scale 1.02

Pressed

Scale 0.97

Recording

Animated Pulse

Waveform

Animated Draw

Charts

Fade In

Loading

Skeleton UI

Toast Notifications

Professional transitions.

------------------------------------------------------------

PROCESSING HISTORY

Maintain a history panel.

Example

Original

↓

Spectral Subtraction

↓

Wiener Filter

↓

Export

Users should be able to preview any previous processing stage.

------------------------------------------------------------

AUDIO METADATA PANEL

Always display

File Name

Duration

File Size

Sample Rate

Channels

Bit Depth

Encoding

Last Modified

------------------------------------------------------------

EMPTY STATES

Design beautiful empty states.

Examples

No Audio Imported

No Processing Results

No Export History

No Recent Projects

Each should include

Illustration

Title

Description

Primary Action Button

------------------------------------------------------------

CODE QUALITY

Write production-quality code.

Use reusable components.

Use clean architecture.

Write readable code.

Avoid duplicate logic.

Prepare the project for future expansion.

------------------------------------------------------------

IMPORTANT

Do NOT simplify the interface.

Do NOT replace engineering layouts with generic templates.

Do NOT create placeholder pages unless absolutely necessary.

Implement as many working features as possible.

The final application should look like commercial DSP software developed for engineering laboratories rather than a typical academic project.

Take your time.

Prioritize quality over speed.

Generate the best possible Version 1.0 of VinWave Studio.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://vinwave.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8d789eda-7689-48d3-987e-d55ff2efdfb7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
