import * as BABYLON from '@babylonjs/core'
import future from 'fp-future';
import { createCrossHair } from './visual/crosshair'

export const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement; // Get the canvas element

export const engine = new BABYLON.Engine(canvas, true, {
  audioEngine: true,
  autoEnableWebVR: true,
  deterministicLockstep: true,
  lockstepMaxSteps: 4,
  alpha: false,
  antialias: true,
  stencil: true
})

/**
 * This is the main scene of the engine.
 */
export const scene = new BABYLON.Scene(engine)
export const audioEngine = BABYLON.Engine.audioEngine
export let highlightLayer: BABYLON.HighlightLayer
export const effectLayers: BABYLON.EffectLayer[] = []
export const sceneReadyFuture = future<void>()

export const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);

export async function initEngine() {
  const vrHelper = await scene.createDefaultXRExperienceAsync({})

  scene.clearColor = BABYLON.Color3.FromInts(31, 29, 35).toColor4(1)
  scene.collisionsEnabled = true

  scene.autoClear = false // Color buffer
  scene.autoClearDepthAndStencil = false // Depth and stencil
  scene.setRenderingAutoClearDepthStencil(0, false)
  scene.setRenderingAutoClearDepthStencil(1, true, true, false)

  canvas.style.width = '100%'
  canvas.style.height = '100%'

  // scene.gravity = new BABYLON.Vector3(0, playerConfigurations.gravity, 0)
  // scene.enablePhysics(scene.gravity, new BABYLON.OimoJSPlugin(2))
  scene.audioEnabled = true
  scene.headphone = true


  scene.actionManager = new BABYLON.ActionManager(scene)

  engine.enableOfflineSupport = false


  engine.disableManifestCheck = true

  scene.getBoundingBoxRenderer().showBackLines = false

  scene.onReadyObservable.addOnce(() => {
    const gl = new BABYLON.GlowLayer('glow', scene)
    effectLayers.push(gl)

    effectLayers.forEach($ => scene.effectLayers.includes($) || scene.addEffectLayer($))

    scene.removeEffectLayer = function(this: any, layer: BABYLON.EffectLayer) {
      if (effectLayers.includes(layer)) return
      scene.constructor.prototype.removeEffectLayer.apply(this, arguments)
    } as any

    scene.addEffectLayer = function(this: any, layer: BABYLON.EffectLayer) {
      if (effectLayers.includes(layer)) return
      scene.constructor.prototype.addEffectLayer.apply(this, arguments)
    } as any

    sceneReadyFuture.resolve()
  })

  getHighlightLayer()

  // Register a render loop to repeatedly render the scene
  engine.runRenderLoop(function () {
    scene.render();
  });

  // Watch for browser/canvas resize events
  window.addEventListener("resize", function () {
    engine.resize();
  });
}


export function getHighlightLayer() {
  if (highlightLayer) {
    return highlightLayer
  }

  highlightLayer = new BABYLON.HighlightLayer('highlight', scene)

  if (!scene.effectLayers.includes(highlightLayer)) {
    scene.addEffectLayer(highlightLayer)
  }

  highlightLayer.innerGlow = false
  highlightLayer.outerGlow = true

  effectLayers.push(highlightLayer)

  return highlightLayer
}
