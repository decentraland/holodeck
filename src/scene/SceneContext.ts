import * as BABYLON from '@babylonjs/core'
import { ComponentDefinition, Entity, WireMessage } from '@dcl/sdk/ecs'
import { EcsEntity } from './EcsEntity'

export class SceneContext {
  entities = new Map<Entity, EcsEntity>()
  weakThis = new WeakRef(this)
  rootNode: EcsEntity

  logger = {
    log: console.log.bind(console),
    error: console.error.bind(console),
  }

  constructor(scene: BABYLON.Scene) {
    this.rootNode = new EcsEntity(0 as Entity, this.weakThis)
  }

  processEcsChange(entityId: Entity, component: ComponentDefinition<any>, op: WireMessage.Enum) {
    if (op == /*PUT_COMPONENT*/ 1) {
      // when setting a component value we need to get or create the entity
      const entity = this.getOrCreateEntity(entityId)
      entity.putComponent(component)
    } else if (op == /*DELETE_COMPONENT*/ 2) {
      // when deleting a component, we can skip the entity creation if it doesn't exist
      const entity = this.getOrCreateEntity(entityId)
      if (entity) {
        entity.deleteComponent(component)
        if (shouldEntityBeDeleted(entity)) {
          this.removeEntity(entityId)
        }
      }
    }
  }

  removeEntity(entityId: Entity) {
    const entity = this.getEntityOrNull(entityId)
    if (entity) {
      entity.dispose()
      this.entities.delete(entityId)
    }
  }

  getOrCreateEntity(entityId: Entity): EcsEntity {
    let entity = this.entities.get(entityId)
    if (!entity) {
      entity = new EcsEntity(entityId, this.weakThis)
      this.entities.set(entityId, entity)
    }
    return entity
  }

  getEntityOrNull(entityId: Entity): EcsEntity | null {
    return this.entities.get(entityId) || null
  }
}

// an entity only exists if it has any component attached to it
function shouldEntityBeDeleted(entity: EcsEntity) {
  return entity.usedComponents.size == 0
}
