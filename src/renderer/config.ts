export const PARCEL_SIZE = 16
const VISIBLE_RADIUS = 5


export namespace visualConfigurations {
  export const fieldOfView = 75
  export const farDistance = VISIBLE_RADIUS * PARCEL_SIZE

  export const near = 0.08
  export const far = farDistance
}

export namespace playerConfigurations {
  export const gravity = -0.2
  export const height = 1.6
  export const handFromBodyDistance = 0.5
  // The player speed
  export const speed = 2
  export const runningSpeed = 8
  // The player inertia
  export const inertia = 0.01
  // The mouse sensibility (lower is most sensible)
  export const angularSensibility = 500
}