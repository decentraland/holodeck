import { MeshBuilder, Mesh, Vector3, Space } from '@babylonjs/core'
import { PBMeshRenderer } from '@dcl/sdk/ecs'
import type { ComponentOperation } from '../component-operations'
import { EcsEntity } from '../EcsEntity'
import { isEntityPickable } from './pointer-events'

const baseBox = MeshBuilder.CreateBox('base-box', {
  updatable: false,
})

export const putMeshRendererComponent: ComponentOperation = (entity, component) => {
  const newValue = component.getOrNull(entity.entityId) as PBMeshRenderer | null
  const currentValue = entity.ecsComponentValues.meshRenderer
  entity.ecsComponentValues.meshRenderer = newValue || undefined

  if (!newValue) {
    removeMeshRenderer(entity)
  } else {
    if (currentValue?.mesh?.$case !== newValue?.mesh?.$case) {
      if (newValue?.mesh?.$case == 'box') {
        removeMeshRenderer(entity)
        entity.meshRenderer = baseBox.createInstance("instanced-box")
        entity.meshRenderer.parent = entity
      }
    }

    if (entity.meshRenderer) {
      entity.meshRenderer.isPickable = isEntityPickable(entity)
    }
  }
}

function removeMeshRenderer(entity: EcsEntity) {
  if (entity.meshRenderer) {
    entity.meshRenderer.dispose(false, false)
    delete entity.meshRenderer
  }
}
