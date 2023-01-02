import * as Schemas from '@dcl/schemas'
import { ComponentDefinition, Engine, Entity, Transport, WireMessage } from '@dcl/sdk/ecs'
import { EcsEntity } from './EcsEntity'
import { babylon } from '../renderer/setup/defaultScene'
import * as components from '@dcl/ecs/dist/components'
import future, { IFuture } from 'fp-future'

export type LoadableScene = {
  readonly entity: Readonly<Omit<Schemas.Entity, 'id'>>
  readonly baseUrl: string
  readonly id: string
}

export class SceneContext {
  #entities = new Map<Entity, EcsEntity>()
  #weakThis = new WeakRef(this)
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

  transport: Transport

  /**
   * messages that will go to the original engine
   * @ADR https://adr.decentraland.org/adr/ADR-148
   */
  outMessages: Uint8Array[] = []
  /**
   * incoming messages from other engines
   * @ADR https://adr.decentraland.org/adr/ADR-148
   */
  incomingMessages: Uint8Array[] = []
  /**
   * promises for the next frame update. it is resolved after the engine fully
   * processed the incoming messages and outgoing changes. the promises are
   * resolved using the messages that were sent to the transport during
   * the frame
   * @ADR https://adr.decentraland.org/adr/ADR-148
   */
  nextFrameFutures: Array<IFuture<Uint8Array[]>> = []

  // this future is resolved when the scene is disposed
  readonly stopped = future<void>()

  constructor(public loadableScene: LoadableScene) {
    this.rootNode = new EcsEntity(0 as Entity, this.#weakThis)
    this.transport = {
      filter() {
        return true
      },
      send: async (message: Uint8Array) => {
        if (message.length) {
          this.outMessages.push(message)
        }
      },
    }
    this.engine.addTransport(this.transport)

    babylon.onEndFrameObservable.add(this.update)
  }

  /**
   * Receive all the messages from other CRDT engine. It returns a promise with
   * the serialized state changes for the other engine, like camera position.
   *
   * @ADR https://adr.decentraland.org/adr/ADR-148
   */
  async receiveBatch(batch: Uint8Array[]): Promise<Uint8Array[]> {
    this.incomingMessages.push(...batch)

    // create a promise for the next frame processing
    const fut = future<Uint8Array[]>()
    this.nextFrameFutures.push(fut)
    return fut
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
      this.#entities.delete(entityId)
    }
  }

  getOrCreateEntity(entityId: Entity): EcsEntity {
    let entity = this.#entities.get(entityId)
    if (!entity) {
      entity = new EcsEntity(entityId, this.#weakThis)
      this.#entities.set(entityId, entity)
    }
    return entity
  }

  getEntityOrNull(entityId: Entity): EcsEntity | null {
    return this.#entities.get(entityId) || null
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

  resolveFileAbsolute(src: string): string | null {
    const resolved = this.resolveFile(src)

    if (src) return this.loadableScene.baseUrl + resolved

    return null
  }

  readonly update = async() => {
    // copy the array and clean the incoming messages to prevent information loss
    const inMessages = this.incomingMessages.splice(0)

    // first process all the messages as per ADR-148
    for (const message of inMessages) {
      this.transport.onmessage?.call(null, message)
    }

    // update the engine
    await this.engine.update(babylon.getDeltaTime() / 1000)

    // collect updates and clean outMessages
    const updates = this.outMessages.splice(0)

    // finally resolve the future so the function "receiveBatch" is unblocked
    // and the next scripting frame is allowed to happen
    this.nextFrameFutures.forEach((fut) => fut.resolve(updates))

    // finally clean the futures
    this.nextFrameFutures.length = 0
  }

  dispose() {
    this.stopped.resolve()
    for(const [entityId] of this.#entities) {
      this.removeEntity(entityId)
    }
    this.rootNode.parent = null
    this.rootNode.dispose()
    babylon.onEndFrameObservable.removeCallback(this.update)
  }
}

// an entity only exists if it has any component attached to it
function shouldEntityBeDeleted(entity: EcsEntity) {
  return entity.usedComponents.size == 0
}