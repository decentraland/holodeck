import { AbstractMesh } from '@babylonjs/core'
import { GridMaterial } from '@babylonjs/materials'
import { scene } from '../setup/defaultScene'

const colliderSymbol = Symbol('isCollider')

export const colliderMaterial = new GridMaterial('collider-material', scene)

colliderMaterial.opacity = 0.99
colliderMaterial.sideOrientation = 0
colliderMaterial.zOffset = -1
colliderMaterial.fogEnabled = false

export function markAsCollider(mesh: AbstractMesh) {
  ;(mesh as any)[colliderSymbol] = true
  mesh.material = colliderMaterial
}

export function isCollider(mesh: AbstractMesh) {
  return !!(mesh as any)[colliderSymbol]
}
