import { ContainerUtils } from '../../../../module/data/mixins/container-utils.js'
import { IContainable } from '../../../../module/data/mixins/containable.js'

interface MockContainable extends IContainable<MockContainable> {
  id: string
  containedBy: string | null
  open: boolean
  contents: MockContainable[]
  allContents: MockContainable[]
  container: MockContainable | null
  isContained: boolean
  containerDepth: number
  getDescendants(filter?: (item: MockContainable) => boolean): MockContainable[]
  isContainedBy(item: MockContainable): boolean
}

describe('ContainerUtils', () => {
  // Create mock containable objects for testing
  function createMockContainable(id: string, containedBy: string | null = null): MockContainable {
    const mock: MockContainable = {
      id: id,
      containedBy,
      open: true,
      // Mandatory implementations.
      get container(): MockContainable | null {
        return _contents.find(item => item.id === this.containedBy) || null
      },
      get contents(): MockContainable[] {
        return _contents.filter(item => item.containedBy === this.id)
      },

      // Delegated to ContainerUtils.
      get allContents() {
        return ContainerUtils.getAllContents(this)
      },
      containsItem(item: MockContainable) {
        return ContainerUtils.containsItem(this, item)
      },
      get isContained(): boolean {
        return ContainerUtils.isContained(this)
      },
      get containerDepth(): number {
        return ContainerUtils.getContainerDepth(this)
      },
      get ancestors(): MockContainable[] {
        return ContainerUtils.getAncestors(this)
      },
      getDescendants(filter?: (item: MockContainable) => boolean): MockContainable[] {
        return ContainerUtils.getDescendants(this, filter)
      },
      isContainedBy(item: MockContainable): boolean {
        return ContainerUtils.isContainedBy(this, item)
      },
    }
    _contents.push(mock)
    return mock
  }

  let _contents: MockContainable[] = []

  beforeEach(() => {
    _contents = []
  })

  describe('isContained', () => {
    it('should return false for items with no container', () => {
      const item = createMockContainable('item1', null)
      expect(item.isContained).toBe(false)
    })

    it('should return true for contained items', () => {
      createMockContainable('container1')
      const item = createMockContainable('item1', 'container1')
      expect(item.isContained).toBe(true)
    })
  })

  describe('getAllContents', () => {
    it('should return all nested contents recursively', () => {
      const parent = createMockContainable('parent', null)

      createMockContainable('child1', 'parent')
      createMockContainable('child2', 'parent')
      createMockContainable('subchild', 'child1')

      const allContents = parent.allContents

      expect(allContents).toHaveLength(3)
      expect(allContents.map(item => item.id)).toEqual(['child1', 'subchild', 'child2'])
    })

    it('should return empty array for items with no contents', () => {
      const item = createMockContainable('item1')
      const allContents = item.allContents
      expect(allContents).toHaveLength(0)
    })
  })

  describe('getAncestors', () => {
    it('should return all ancestors in order', () => {
      createMockContainable('grandparent')
      createMockContainable('parent', 'grandparent')
      const child = createMockContainable('child', 'parent')

      const ancestors = child.ancestors

      expect(ancestors).toHaveLength(2)
      expect(ancestors![0].id).toBe('grandparent')
      expect(ancestors![1].id).toBe('parent')
    })

    it('should return empty array for top-level items', () => {
      const item = createMockContainable('item1')
      const ancestors = item.ancestors
      expect(ancestors).toHaveLength(0)
    })
  })

  describe('getContainerDepth', () => {
    it('should calculate correct depth', () => {
      const grandparent = createMockContainable('grandparent')
      const parent = createMockContainable('parent', 'grandparent')
      const child = createMockContainable('child', 'parent')

      expect(grandparent.containerDepth).toBe(0)
      expect(parent.containerDepth).toBe(1)
      expect(child.containerDepth).toBe(2)
    })
  })

  describe('contains', () => {
    it('should return true if item is contained directly', () => {
      const container = createMockContainable('container1')
      const item = createMockContainable('item1', 'container1')

      expect(container.containsItem(item)).toBe(true)
    })

    it('should return true if item is contained indirectly', () => {
      const container = createMockContainable('container1')
      createMockContainable('intermediate', 'container1')
      const item = createMockContainable('item1', 'intermediate')

      expect(container.containsItem(item)).toBe(true)
    })

    it('should return false if item is not contained', () => {
      const container = createMockContainable('container1')
      const item = createMockContainable('item1')

      expect(container.containsItem(item)).toBe(false)
    })
  })

  describe('getDescendants', () => {
    it('should return all descendants without filter', () => {
      const container = createMockContainable('container1')
      createMockContainable('child1', 'container1')
      createMockContainable('child2', 'container1')
      createMockContainable('subchild', 'child1')

      const descendants = container.getDescendants()

      expect(descendants).toHaveLength(3)
      expect(descendants.map(item => item.id)).toEqual(['child1', 'subchild', 'child2'])
    })

    it('should return filtered descendants', () => {
      const container = createMockContainable('container1')
      createMockContainable('child1', 'container1')
      createMockContainable('child2', 'container1')
      createMockContainable('subchild', 'child1')

      const descendants = container.getDescendants(item => item.id.startsWith('child'))

      expect(descendants).toHaveLength(2)
      expect(descendants.map(item => item.id)).toEqual(['child1', 'child2'])
    })

    it('should return empty array if no descendants match filter', () => {
      const container = createMockContainable('container1')
      createMockContainable('child1', 'container1')
      createMockContainable('child2', 'container1')

      const descendants = container.getDescendants(item => item.id === 'nonexistent')

      expect(descendants).toHaveLength(0)
    })

    it('should return empty array for items with no contents', () => {
      const item = createMockContainable('item1')
      const descendants = item.getDescendants()
      expect(descendants).toHaveLength(0)
    })
  })

  describe('isContainedBy', () => {
    it('should return true for direct containment', () => {
      const container = createMockContainable('container1')
      const item = createMockContainable('item1', 'container1')

      const result = item.isContainedBy(container)

      expect(result).toBe(true)
    })

    it('should return true if item is indirectly contained by specified container', () => {
      const container = createMockContainable('container1')
      createMockContainable('intermediate', 'container1')
      const item = createMockContainable('item1', 'intermediate')

      const result = item.isContainedBy(container)

      expect(result).toBe(true)
    })

    it('should return false if item is not contained by specified container', () => {
      const container = createMockContainable('container1')
      const item = createMockContainable('item1')

      const result = item.isContainedBy(container)

      expect(result).toBe(false)
    })
  })
})
