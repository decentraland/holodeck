import * as BABYLON from '@babylonjs/core'
import { firstPersonCamera, isFirstPersonCamera, editorCamera, isEditorCamera } from './camera'
import { playerConfigurations } from './config'
import { scene, engine, canvas } from './defaultScene'

/**
 * This is a map of keys (see enum Keys): boolean
 */
const keyState: {
  [keyCode: number]: boolean
  [keyName: string]: boolean
} = {}

enum Keys {
  KEY_W = 87,
  KEY_A = 65,
  KEY_F = 70,
  KEY_S = 83,
  KEY_D = 68,

  KEY_LEFT = 37,
  KEY_UP = 38,
  KEY_RIGHT = 39,
  KEY_DOWN = 40,

  KEY_SHIFT = -1,
  KEY_CTRL = -2,
  KEY_SPACE = 32,

  KEY_E = 69,
  KEY_Q = 81,
}

/// --- EXPORTS ---

export { keyState, Keys }

let didInit = false

export function initKeyboard() {
  if (didInit) return
  didInit = true

  enableMouseLock(canvas)

  firstPersonCamera.keysUp = [Keys.KEY_W, Keys.KEY_UP] // W
  firstPersonCamera.keysDown = [Keys.KEY_S, Keys.KEY_DOWN] // S
  firstPersonCamera.keysLeft = [Keys.KEY_A, Keys.KEY_LEFT] // A
  firstPersonCamera.keysRight = [Keys.KEY_D, Keys.KEY_RIGHT] // D

  document.body.addEventListener('keydown', (e) => {
    keyState[Keys.KEY_SHIFT] = e.shiftKey
    keyState[Keys.KEY_CTRL] = e.ctrlKey
    keyState[e.keyCode] = true
  })

  document.body.addEventListener('keyup', (e) => {
    if (!e.shiftKey) {
      firstPersonCamera.speed = playerConfigurations.speed
    }

    keyState[Keys.KEY_SHIFT] = e.shiftKey
    keyState[Keys.KEY_CTRL] = e.ctrlKey
    keyState[e.keyCode] = false
  })

  const CAMERA_SPEED = 0.01
  const CAMERA_LEFT = BABYLON.Quaternion.RotationYawPitchRoll(Math.PI / 2, 0, 0)
  const CAMERA_RIGHT = BABYLON.Quaternion.RotationYawPitchRoll(-Math.PI / 2, 0, 0)
  const CAMERA_FORWARD = BABYLON.Quaternion.RotationYawPitchRoll(Math.PI, 0, 0)
  const CAMERA_BACKWARD = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0)

  editorCamera.keysDown = []
  editorCamera.keysUp = []
  editorCamera.keysLeft = []
  editorCamera.keysRight = []

  editorCamera.onAfterCheckInputsObservable.add(() => {
    if (editorCamera === scene.activeCamera) {
      if (keyState[Keys.KEY_LEFT] || keyState[Keys.KEY_A]) {
        editorCamera.target.addInPlace(
          moveCamera(editorCamera, CAMERA_LEFT, CAMERA_SPEED * engine.getDeltaTime())
        )
      }

      if (keyState[Keys.KEY_RIGHT] || keyState[Keys.KEY_D]) {
        editorCamera.target.addInPlace(
          moveCamera(editorCamera, CAMERA_RIGHT, CAMERA_SPEED * engine.getDeltaTime())
        )
      }

      if (keyState[Keys.KEY_UP] || keyState[Keys.KEY_W]) {
        editorCamera.target.addInPlace(
          moveCamera(editorCamera, CAMERA_FORWARD, CAMERA_SPEED * engine.getDeltaTime())
        )
      }

      if (keyState[Keys.KEY_DOWN] || keyState[Keys.KEY_S]) {
        editorCamera.target.addInPlace(
          moveCamera(editorCamera, CAMERA_BACKWARD, CAMERA_SPEED * engine.getDeltaTime())
        )
      }
    }
  })
}

function moveCamera(camera: BABYLON.ArcRotateCamera, directionRotation: BABYLON.Quaternion, speed: number) {
  const direction = camera.position.subtract(camera.target)
  direction.y = 0
  direction.normalize()

  applyQuaternion(direction, directionRotation)
  return direction.scaleInPlace(speed)
}

function applyQuaternion(v: BABYLON.Vector3, q: BABYLON.Quaternion) {
  let x = v.x
  let y = v.y
  let z = v.z
  let qx = q.x
  let qy = q.y
  let qz = q.z
  let qw = q.w

  // calculate quat * vector

  let ix = qw * x + qy * z - qz * y
  let iy = qw * y + qz * x - qx * z
  let iz = qw * z + qx * y - qy * x
  let iw = -qx * x - qy * y - qz * z

  // calculate result * inverse quat

  v.x = ix * qw + iw * -qx + iy * -qz - iz * -qy
  v.y = iy * qw + iw * -qy + iz * -qx - ix * -qz
  v.z = iz * qw + iw * -qz + ix * -qy - iy * -qx

  return v
}

function findParentEntity<T extends BABYLON.Node & { isDCLEntity?: boolean }>(
  node: T
): {
  handleClick(pointerEvent: 'pointerUp' | 'pointerDown', pointerId: number, pickingResult: BABYLON.PickingInfo): void
} | null {
  // Find the next entity parent to dispatch the event
  let parent: BABYLON.Node | null = node.parent

  while (parent && !('isDCLEntity' in parent)) {
    parent = parent.parent

    // If the element has no parent, stop execution
    if (!parent) return null
  }

  return (parent as any) || null
}

export function interactWithScene(pointerEvent: 'pointerUp' | 'pointerDown', x: number, y: number, pointerId: number) {
  const pickingResult = scene.pick(x, y, void 0, false)

  const mesh = pickingResult!.pickedMesh

  const entity = mesh && findParentEntity(mesh)

  if (entity) {
    entity.handleClick(pointerEvent, pointerId, pickingResult!)
  } else {
    // for (let [, scene] of loadedSceneWorkers) {
    //   if (scene.parcelScene instanceof WebGLScene) {
    //     scene.parcelScene.context.sendPointerEvent(pointerEvent, pointerId, null as any, pickingResult!)
    //   }
    // }
  }
}

export function enableMouseLock(canvas: HTMLCanvasElement) {
  const hasPointerLock = () => document.pointerLockElement === canvas

  if (!canvas.requestPointerLock) {
    canvas.requestPointerLock = canvas.requestPointerLock || canvas['mozRequestPointerLock']
  }

  scene.onPointerObservable.add((e) => {
    if (e.type === BABYLON.PointerEventTypes.POINTERDOWN) {
      const evt = e.event as PointerEvent
      if (isEditorCamera()) {
        canvas.focus()
        interactWithScene('pointerDown', evt.offsetX, evt.offsetY, evt.pointerId)
      } else {
        if (hasPointerLock()) {
          canvas.focus()
          interactWithScene('pointerDown', canvas.width / 2, canvas.height / 2, evt.pointerId)
        } else {
          canvas.requestPointerLock()
          canvas.focus()
        }
      }
    } else if (e.type === BABYLON.PointerEventTypes.POINTERUP) {
      const evt = e.event as PointerEvent

      if (isEditorCamera() || !isFirstPersonCamera()) {
        interactWithScene('pointerUp', evt.offsetX, evt.offsetY, evt.pointerId)
      } else if (hasPointerLock()) {
        interactWithScene('pointerUp', canvas.width / 2, canvas.height / 2, evt.pointerId)
      }
    }
  })
}
