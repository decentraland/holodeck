import { loadRemoteVmScene } from './runtimes/quickjs-vm'
import { connectSameThreadScene, getHardcodedLoadableScene } from './runtimes/same-thread'
import { SceneContext } from './scene/SceneContext'

// First load a quickJS vm running a world
{
  const menduzDclEthWorld =
    'urn:decentraland:entity:bafkreihiv5zkzjui46gvxtsnk5pfogmq7kyzijxpf3gjqlb2ivydcuwgxq?baseUrl=https://worlds-content-server.decentraland.org/ipfs/'

  loadRemoteVmScene(menduzDclEthWorld).catch((err) => {
    console.error(err)
    debugger
  })
}

// then load a "same thread" vm, running on the rendering thread
{
  const scene1 = new SceneContext(
    getHardcodedLoadableScene('urn:decentraland:entity:bafkreid44xhavttoz4nznidmyj3rjnrgdza7v6l7kd46xdmleor5lmsxfm1')
  )
  scene1.rootNode.position.set(50, 5, 0)
  connectSameThreadScene(scene1)
}
