import * as BABYLON from '@babylonjs/core'
import { scene, canvas, babylon, effectLayers } from './defaultScene'
import { initKeyboard } from './input'

export async function initEngine(): Promise<BABYLON.Scene> {
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



  babylon.disableManifestCheck = true

  scene.getBoundingBoxRenderer().showBackLines = false

  scene.onReadyObservable.addOnce(() => {
    const gl = new BABYLON.GlowLayer('glow', scene)
    effectLayers.push(gl)

    effectLayers.forEach(($) => scene.effectLayers.includes($) || scene.addEffectLayer($))

    scene.removeEffectLayer = function (this: any, layer: BABYLON.EffectLayer) {
      if (effectLayers.includes(layer)) return
      scene.constructor.prototype.removeEffectLayer.apply(this, arguments)
    } as any

    scene.addEffectLayer = function (this: any, layer: BABYLON.EffectLayer) {
      if (effectLayers.includes(layer)) return
      scene.constructor.prototype.addEffectLayer.apply(this, arguments)
    } as any
  })

  BABYLON.Database.IDBStorageEnabled = true
  babylon.enableOfflineSupport = true

  initKeyboard()

  // Register a render loop to repeatedly render the scene
  babylon.runRenderLoop(function () {
    scene.render()
  })

  // Watch for browser/canvas resize events
  window.addEventListener('resize', function () {
    babylon.resize()
  })

  return scene
}
