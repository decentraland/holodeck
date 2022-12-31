import * as BABYLON from '@babylonjs/core'
import { scene } from './defaultScene'

export const thirdPersonCamera = new BABYLON.ArcRotateCamera(
  'thirdPersonCamera',
  -Math.PI / 2,
  Math.PI / 2.5,
  15,
  new BABYLON.Vector3(0, 0, 0)
)

export const editorCamera = new BABYLON.ArcRotateCamera(
  'editorCamera',
  -Math.PI / 2,
  Math.PI / 2.5,
  15,
  new BABYLON.Vector3(0, 0, 0)
)

export const firstPersonCamera = new BABYLON.FreeCamera('firstPersonCamera', new BABYLON.Vector3(5, 1.6, 5))
firstPersonCamera.applyGravity = true
firstPersonCamera.inertia = 0.5
firstPersonCamera.checkCollisions = true


export function isFirstPersonCamera() {
  return scene.activeCamera == firstPersonCamera
}

export function isEditorCamera() {
  return scene.activeCamera == editorCamera
}
