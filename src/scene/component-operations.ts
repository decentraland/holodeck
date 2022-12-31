import { ComponentDefinition, Entity } from '@dcl/sdk/ecs'
import { Transform } from '@dcl/sdk/ecs'
import { EcsEntity } from './EcsEntity'
import { putTransformComponent } from './transform-logic'

export type ComponentOperation = <T>(entity: Entity, ecsEntity: EcsEntity, component: ComponentDefinition<T>) => void

export const componentPutOperations: Record<number, ComponentOperation> = {
  [Transform._id]: putTransformComponent,
}