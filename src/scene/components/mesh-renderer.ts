import { MeshBuilder, Mesh, Vector3, Space, VertexBuffer } from '@babylonjs/core'
import { PBMeshRenderer } from '@dcl/sdk/ecs'
import type { ComponentOperation } from '../component-operations'
import { EcsEntity } from '../EcsEntity'
import { isEntityPickable } from './pointer-events'

const baseBox = MeshBuilder.CreateBox('base-box', {
  updatable: false,
})

export const putMeshRendererComponent: ComponentOperation = (entity, component) => {
  const newValue = component.getOrNull(entity.entityId) as PBMeshRenderer | null
  entity.ecsComponentValues.meshRenderer = newValue || undefined

  // for simplicity of the example, we will remove the Mesh on every update.
  // this is not optimal for production code, re-using when possible is RECOMMENDED
  removeMeshRenderer(entity)

  // then proceed to create the desired MeshRenderer
  if (newValue?.mesh?.$case == 'box') {
    entity.meshRenderer = baseBox.createInstance('instanced-box')
    entity.meshRenderer.parent = entity
  } else if (newValue?.mesh?.$case == 'plane') {
    const mesh = MeshBuilder.CreatePlane('plane-shape', {
      width: 1,
      height: 1,
      sideOrientation: 2,
      updatable: true,
    })

    if (newValue.mesh.plane.uvs?.length) {
      mesh.updateVerticesData(VertexBuffer.UVKind, newValue.mesh.plane.uvs)
    } else {
      mesh.updateVerticesData(VertexBuffer.UVKind, [0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0])
    }

    entity.meshRenderer = mesh
    entity.meshRenderer.parent = entity
  }

  // make the renderer interactable only if the entity is Pickable
  if (entity.meshRenderer) {
    entity.meshRenderer.isPickable = isEntityPickable(entity)
  }
}

function removeMeshRenderer(entity: EcsEntity) {
  if (entity.meshRenderer) {
    entity.meshRenderer.dispose(false, false)
    delete entity.meshRenderer
  }
}
