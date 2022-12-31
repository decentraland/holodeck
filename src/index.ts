import * as BABYLON from '@babylonjs/core'
require('@babylonjs/inspector')

import { initEngine, scene } from './renderer/defaultScene'
import './renderer/camera'
import { probe, setCamera } from './renderer/visual/ambientLights'

;import { initKeyboard } from './renderer/input';
import { editorCamera } from './renderer/camera';

initKeyboard()
// Add your code here matching the playground format
initEngine().then(() => {
  // cube
  BABYLON.MeshBuilder.CreateBox('box', {})

  // Sphere
  var sphere = BABYLON.MeshBuilder.CreateSphere('sphere1', {})
  sphere.position.y = 1
  sphere.position.set(0, 3, 0)

  // PBR
  var pbr = new BABYLON.PBRMaterial('pbr', scene)
  pbr.reflectionTexture = probe.cubeTexture
  sphere.material = pbr

  setCamera(editorCamera)

  scene.debugLayer.show({ showExplorer: true, embedMode: true })
})
