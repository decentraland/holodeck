require('@babylonjs/inspector')

import { initEngine } from './renderer/setup'
import './renderer/setup/camera'
import { setCamera } from './renderer/visual/ambientLights'

import { editorCamera } from './renderer/setup/camera';

import './scene'
import './mocked-scene'

// Add your code here matching the playground format
initEngine().then((scene) => {
  // // PBR
  // var pbr = new BABYLON.PBRMaterial('pbr', scene)
  // pbr.reflectionTexture = probe.cubeTexture
  // sphere.material = pbr

  setCamera(editorCamera)

  scene.debugLayer.show({ showExplorer: true, embedMode: true })
})
