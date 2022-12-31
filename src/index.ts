import * as BABYLON from '@babylonjs/core'
require('@babylonjs/inspector')

import { initEngine } from './renderer/setup'
import './renderer/setup/camera'
import { probe, setCamera } from './renderer/visual/ambientLights'

import { editorCamera } from './renderer/setup/camera';

import './scene'
import './mocked-scene'


// Add your code here matching the playground format
initEngine().then((scene) => {
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
