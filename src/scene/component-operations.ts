import { Billboard, ComponentDefinition, GltfContainer, MeshRenderer, PointerEvents } from '@dcl/sdk/ecs'
import { Transform } from '@dcl/sdk/ecs'
import { EcsEntity } from './EcsEntity'
import { putTransformComponent } from './components/transform'
import { putMeshRendererComponent } from './components/mesh-renderer'
import { putPointerEventsComponent } from './components/pointer-events'
import { putBillboardComponent } from './components/billboard'
import { putGltfContaierComponent } from './components/gltf-container'

export type ComponentOperation = <T>(ecsEntity: EcsEntity, component: ComponentDefinition<T>) => void

export const componentPutOperations: Record<number, ComponentOperation> = {
  [Transform._id]: putTransformComponent,
  [MeshRenderer._id]: putMeshRendererComponent,
  [PointerEvents._id]: putPointerEventsComponent,
  [Billboard._id]: putBillboardComponent,
  [GltfContainer._id]: putGltfContaierComponent,
}