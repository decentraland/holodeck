import * as BABYLON from '@babylonjs/core'
import future from 'fp-future'

export const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement // Get the canvas element

export const babylon = new BABYLON.Engine(canvas, true, {
  audioEngine: true,
  autoEnableWebVR: true,
  deterministicLockstep: true,
  lockstepMaxSteps: 4,
  alpha: false,
  antialias: true,
  stencil: true,
})

/**
 * This is the main scene of the engine.
 */
export const scene = new BABYLON.Scene(babylon)
export const audioEngine = BABYLON.Engine.audioEngine
export const effectLayers: BABYLON.EffectLayer[] = []

export const highlightLayer: BABYLON.HighlightLayer = new BABYLON.HighlightLayer('highlight', scene)

{
  if (!scene.effectLayers.includes(highlightLayer)) {
    scene.addEffectLayer(highlightLayer)
  }

  highlightLayer.innerGlow = false
  highlightLayer.outerGlow = true

  effectLayers.push(highlightLayer)
}
