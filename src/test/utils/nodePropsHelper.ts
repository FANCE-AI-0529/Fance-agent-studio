/**
 * Test utilities for xyflow NodeProps
 * Simplified helper that bypasses complex xyflow typing
 */

// Create NodeProps-like object for testing
// We use any cast because xyflow types are very complex and not test-friendly
export function createNodeProps<T extends Record<string, unknown>>(
  data: T,
  overrides: {
    id?: string;
    selected?: boolean;
    type?: string;
  } = {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  return {
    id: overrides.id || "test-node-1",
    data,
    type: overrides.type || "testNode",
    selected: overrides.selected ?? false,
    zIndex: 0,
    isConnectable: true,
    dragging: false,
    draggable: true,
    selectable: true,
    deletable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  };
}
