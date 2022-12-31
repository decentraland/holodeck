import * as Schemas from '@dcl/schemas'
import { ComponentDefinition, Engine, Entity, WireMessage } from '@dcl/sdk/ecs'
import { EcsEntity } from './EcsEntity'
import * as components from '@dcl/ecs/dist/components'

export type LoadableScene = {
  readonly entity: Readonly<Omit<Schemas.Entity, 'id'>>
  readonly baseUrl: string
  readonly id: string
}

export class SceneContext {
  entities = new Map<Entity, EcsEntity>()
  weakThis = new WeakRef(this)
  rootNode: EcsEntity

  logger = {
    log: console.log.bind(console),
    error: console.error.bind(console),
  }

  engine = Engine({
    onChangeFunction: (
      entity: Entity,
      component: ComponentDefinition<any>,
      componentId: number,
      op: WireMessage.Enum
    ) => {
      this.processEcsChange(entity, component, op)
    },
  })

  Billboard = components.Billboard(this.engine)
  Transform = components.Transform(this.engine)
  Material = components.Material(this.engine)
  MeshRenderer = components.MeshRenderer(this.engine)
  GltfContainer = components.GltfContainer(this.engine)
  TextShape = components.TextShape(this.engine)
  PointerEvents = components.PointerEvents(this.engine)

  constructor(public loadableScene: LoadableScene) {
    this.rootNode = new EcsEntity(0 as Entity, this.weakThis)
  }

  private processEcsChange(entityId: Entity, component: ComponentDefinition<any>, op: WireMessage.Enum) {
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

  resolveFile(src: string): string | null {
    // filenames are lower cased as per https://adr.decentraland.org/adr/ADR-80
    const normalized = src.toLowerCase()

    // and we iterate over the entity content mappings to resolve the file hash
    for (const { file, hash } of this.loadableScene.entity.content) {
      if (file.toLowerCase() == normalized) return hash
    }

    return null
  }

  async update(dt: number) {
    await this.engine.update(dt)
  }
}

// an entity only exists if it has any component attached to it
function shouldEntityBeDeleted(entity: EcsEntity) {
  return entity.usedComponents.size == 0
}
