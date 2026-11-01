import { Group } from 'three'
import { createEarth } from './earth'
import { createGraticule } from './graticule'
import { createLighting } from './lighting'

export const createGlobe = (): Group => new Group().add(createEarth(), createGraticule(), createLighting())
